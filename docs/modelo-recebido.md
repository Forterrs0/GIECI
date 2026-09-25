# Balança Automatizada — ESP32 + HX711 + API + MySQL

> **Nota de integração (v2):** este projeto foi adaptado para servir de
> backend do **GIECI** (cliente web em React). Mudanças em relação à
> versão original: adicionadas as tabelas `armarios`/`prateleiras`
> (hierarquia armário → prateleira → produto usada pelo cliente),
> `produtos.peso_atual` passou a ser o campo autoritativo em vez de um
> contador de unidades incrementado por delta, CORS foi habilitado, e a
> API ganhou as rotas `GET/POST/PATCH/DELETE` de armários, prateleiras,
> produtos e histórico que o cliente web consome (ver
> `api/src/routes/`). O caminho do ESP32 (`POST /api/peso`, token Bearer)
> **não mudou** — o firmware não precisa ser reflashado. Detalhes do
> contrato HTTP completo estão no `README.md` do cliente web
> (`gieci-client/README.md`).

Sistema completo para controlar produtos colocados/retirados de uma
balança e registrar automaticamente essas movimentações num banco
MySQL, pronto para virar um sistema real de controle de estoque.

## 1. Visão geral

```
[CÉLULA DE CARGA] → [HX711] → [ESP32] → [Wi-Fi] → [API REST] → [MySQL] → [Painel Web]
```

- A **célula de carga** mede o peso físico.
- O **HX711** amplifica esse sinal analógico e entrega um valor digital ao ESP32.
- O **ESP32** filtra o ruído, espera o peso estabilizar, decide se a
  mudança é significativa e manda o dado pra API.
- A **API** (Node.js/Express) valida, identifica o produto, calcula
  quantidade/tipo de movimentação e grava tudo no **MySQL** dentro de
  uma transação.
- Um **painel web** (não incluso aqui, mas com estrutura sugerida na
  seção 8) consulta a API para mostrar estoque, histórico e status dos
  dispositivos.

## 2. Por que o ESP32 não fala direto com o MySQL

Conectar o ESP32 diretamente ao banco exigiria gravar usuário e senha
do banco de dados no firmware — que fica fisicamente acessível e pode
ser extraído. Além disso, o driver MySQL para microcontroladores é
pesado, MySQL não foi feito para milhares de conexões simultâneas
curtas de dispositivos IoT, e não existiria um lugar central pra
validar payloads antes de irem pro banco. Com a API no meio:

- o ESP32 só guarda um **token de dispositivo**, revogável sem tocar no banco;
- a API valida tudo (formato, autenticação, limites de peso) antes de qualquer escrita;
- é a API quem decide a lógica de negócio (produto, tipo de movimentação, estoque) — o ESP32 só mede e relata.

## 3. Detecção de entrada/saída e histerese

O ESP32 manda o peso já **estabilizado**. A API compara com o último
peso conhecido do produto (`produtos.peso_atual` — não mais
`balancas.ultimo_peso`; ver nota de integração v2 no topo):

- `variação < tolerancia_peso do produto` → ignorado (ruído).
- `variação < 0` → **SAÍDA**.
- `variação > 0` → **ENTRADA**.

A tolerância é por produto (`produtos.tolerancia_peso`), configurável.

## 4. Cálculo de quantidade e "confiança"

```
quantidade = round(variação_absoluta / peso_unitário)
```

Mas isso sozinho seria ingênuo — por isso a API calcula também uma
**confiança** (0–100), comparando o peso esperado para essa quantidade
com o peso realmente medido. Uma variação de 980g com produto de
1000g±50g dá confiança alta; uma variação de 1500g (no meio do
caminho entre 1 e 2 unidades) dá confiança baixa, sinalizando que vale
conferir manualmente. Essa lógica está em
`api/src/services/movimentacaoService.js`.

## 5. Estrutura do banco (MySQL)

Arquivo completo: `database/schema.sql`. Tabelas:

| Tabela | Papel |
|---|---|
| `armarios` | Agrupa prateleiras (v2) |
| `prateleiras` | Agrupa produtos; pertence a um armário ou é avulsa (v2) |
| `produtos` | Catálogo de produtos; `peso_atual` (gramas) é a fonte de verdade do estoque (v2) |
| `dispositivos` | Cada ESP32 físico e seu token de autenticação (hash) |
| `balancas` | Cada balança física, associada a 1 dispositivo e 1 produto |
| `movimentacoes` | Histórico definitivo de entradas/saídas, com `origem` sensor/manual (v2) |
| `leituras_peso` | Leituras brutas estabilizadas, para diagnóstico/gráfico |
| `usuarios` | Opcional — só usada se uma movimentação for atribuída a uma pessoa |

**ENUM vs. tabela de tipos:** `movimentacoes.tipo_movimentacao` usa
`ENUM('ENTRADA','SAIDA')` porque hoje só existem esses dois valores
fixos — é mais simples e rápido de consultar/indexar. Se no futuro
surgirem tipos como `AJUSTE` ou `TRANSFERENCIA`, o ideal passa a ser
uma tabela `tipos_movimentacao` referenciada por FK.

**Chaves e índices:** `produtos.codigo`, `dispositivos.dispositivo_id`
e `balancas.identificacao` são `UNIQUE`. `movimentacoes` tem FKs para
`balancas`, `produtos` e `usuarios`, e índices compostos em
`(produto_id, data_hora)` e `(balanca_id, data_hora)` — são os campos
mais usados nos filtros do histórico e do dashboard.

**Sobre `leituras_peso` crescer demais:** o ESP32 só envia leituras já
estabilizadas (não a cada 200ms), o que já reduz o volume em ordens de
grandeza. Ainda assim, para produção, recomenda-se um job periódico
(evento agendado do MySQL ou cron na API) que apague/arquive linhas
com mais de 60–90 dias — o histórico permanente e enxuto fica em
`movimentacoes`.

**Limitação importante (identificação do produto):** só o peso não
diz *qual* produto foi mexido se dois produtos tiverem pesos
parecidos. Por isso, nesta v1, **cada balança está associada a um
único produto** (`balancas.produto_id`). Alternativas para múltiplos
produtos numa mesma balança: seleção manual numa interface, RFID,
código de barras/QR Code, sensor adicional, visão computacional, ou
compartimentos físicos separados (uma célula de carga por
compartimento).

## 6. API REST (Node.js + Express)

**Por que Node.js/Express:** o payload trocado com o ESP32 é JSON
nativo (assim como no protótipo React do sistema, se você tiver um),
o ecossistema `express` + `mysql2` é leve, bem documentado e lida bem
com múltiplos dispositivos fazendo requisições curtas e assíncronas —
exatamente o padrão de tráfego de sensores IoT. PHP ou Python também
resolveriam bem; a escolha aqui prioriza consistência de stack.

Estrutura (`api/`):
```
src/
  server.js                    # ponto de entrada, monta as rotas
  db.js                        # pool de conexões MySQL
  middleware/auth.js           # autentica o token do ESP32 (Bearer)
  routes/peso.js               # POST /api/peso — recebe leituras
  services/movimentacaoService.js  # regra de negócio (tolerância, quantidade, transação)
  scripts/gerarHashToken.js    # utilitário pra gerar hash bcrypt de um token
```

### Endpoint principal

```
POST /api/peso
Authorization: Bearer <token_do_dispositivo>
Content-Type: application/json

{
  "esp32_id": "ESP32_001",
  "balanca_id": "BAL001",
  "peso": 1000.5,
  "timestamp": "2026-09-12T20:30:00"
}
```

Resposta (quando há movimentação):
```json
{
  "sucesso": true,
  "movimentacao": "SAIDA",
  "produto": "Arroz 1kg",
  "quantidade": 1,
  "peso_anterior": 2000,
  "peso_atual": 1000,
  "variacao": -1000,
  "confianca": 96
}
```
(Quantidade em estoque não vem mais nesta resposta — desde a v2 ela é
sempre derivada de `produtos.peso_atual / produtos.peso_unitario`; para
consultar, use `GET /api/produtos` no cliente web ou a consulta 2 em
`database/consultas.sql`.)

### Transação e consistência

`movimentacaoService.js` faz `SELECT ... FOR UPDATE` (na balança, para
leituras do ESP32; no produto diretamente, para ajustes manuais do
cliente web), calcula tudo, grava a movimentação **e** atualiza o peso
do produto **na mesma transação** (`beginTransaction` / `commit` /
`rollback`). Se qualquer passo falhar, nada é gravado — evita estoque
e histórico ficarem inconsistentes entre si.

### Evitar movimentações duplicadas

Duas camadas de proteção:
1. **No ESP32**: só envia quando o peso estabiliza E muda além do
   limiar (`LIMIAR_ENVIO_G`) em relação ao último valor **enviado**
   (não ao último valor lido) — reenvios acidentais do mesmo valor não
   saem do dispositivo.
2. **Na API**: sempre compara contra `produtos.peso_atual` (v2 — antes
   era `balancas.ultimo_peso`), atualizado a cada requisição processada
   — mesmo que o ESP32 reenvie algo da fila offline fora de ordem, a
   comparação é sempre feita contra o estado mais recente conhecido
   pelo servidor.

## 7. Segurança

- Autenticação por **token fixo por dispositivo**, enviado como
  `Authorization: Bearer <token>`. O token em texto puro só existe no
  firmware do ESP32; o banco guarda apenas o **hash bcrypt**
  (`dispositivos.token_hash`), gerado com
  `npm run gerar-hash -- "token-aqui"`.
- Todo input é validado antes de tocar no banco (`routes/peso.js`), e
  todas as queries usam parâmetros (`?`) via `mysql2`, o que evita
  injeção de SQL.
- **HTTPS**: em rede local fechada, HTTP simples é aceitável para
  prototipagem. Assim que o sistema sair da rede local (ex: ESP32 numa
  filial diferente do servidor, ou API exposta na internet), é
  essencial usar HTTPS — do contrário o token do dispositivo trafega
  em texto puro e pode ser capturado.

## 8. Firmware do ESP32 (`esp32/balanca_automatizada.ino`)

Fluxo, seção por seção do código:

- **Filtro de ruído**: cada "leitura" usada pelo resto do código já é
  a média de `NUM_LEITURAS_MEDIA` (padrão 8) leituras do HX711.
- **Detecção de estabilidade**: o firmware só considera um peso
  "final" depois que ele fica dentro de `TOLERANCIA_ESTABILIDADE_G`
  (10g) por pelo menos `TEMPO_ESTABILIDADE_MS` (2000ms) seguidos —
  assim não registra os "degraus" enquanto alguém ainda está
  colocando/tirando o produto.
- **Histerese de envio**: só manda pro servidor se a diferença entre o
  peso estabilizado e o **último peso enviado** passar de
  `LIMIAR_ENVIO_G` (15g).
- **Wi-Fi + NTP**: reconecta automaticamente se cair, e sincroniza
  hora real via NTP (fuso de Brasília, sem horário de verão).
- **Fila offline**: se o POST falhar, a leitura entra num buffer
  circular de `TAMANHO_FILA` posições e é reenviada a cada 5s até dar
  certo. A fila vive em RAM (perdida em caso de reboot) — ver a seção
  9 sobre a alternativa com armazenamento persistente.
- **JSON com ArduinoJson**: em vez de concatenar strings manualmente,
  usa a biblioteca ArduinoJson pra montar o corpo da requisição, o que
  evita erros de escaping.

### Calibração do HX711

1. Grave um sketch simples (ou use o próprio firmware com
   `Serial.println(balanca.get_units(10))` no loop) sem nenhum peso
   sobre a célula e chame `tare()`.
2. Coloque um peso **conhecido** (ex: 1000g) sobre a célula.
3. Leia o valor bruto sem escala (`get_value()`), e calcule:
   ```
   fator_calibracao = leitura_bruta / peso_conhecido_em_gramas
   ```
4. Ajuste `FATOR_CALIBRACAO` no firmware até que
   `balanca.get_units()` retorne o peso conhecido corretamente.
   Normalmente é um número negativo grande (ex: -7050.0) — o sinal
   depende de como a célula de carga foi montada mecanicamente.

## 9. Modo offline — RAM vs. armazenamento persistente

O firmware deste projeto guarda a fila de reenvio em **RAM**
(simples, mas perdida se o ESP32 reiniciar). Alternativas, se seu caso
de uso não puder perder nenhuma movimentação:

| Opção | Quando usar |
|---|---|
| `Preferences` (NVS) | Poucos valores pequenos, salvos raramente |
| `LittleFS` | Fila maior, estruturada como arquivos/linhas |
| `SPIFFS` | Legado — LittleFS é a evolução recomendada hoje |

O trade-off é o número limitado de ciclos de escrita da memória flash:
gravar a cada leitura desgastaria a flash rapidamente. Se for
persistir, grave só quando uma leitura **entra** ou **sai** da fila
(não a cada tentativa de reenvio).

## 10. Testes rápidos (sem hardware)

Simular o ESP32 com `curl`, depois de rodar `npm install && npm start`
na pasta `api/` (com `.env` configurado e o schema aplicado):

```bash
curl -X POST http://localhost:8000/api/peso \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_EM_TEXTO_PURO" \
  -d '{
    "esp32_id": "ESP32_001",
    "balanca_id": "BAL001",
    "peso": 1000,
    "timestamp": "2026-09-12T20:30:00"
  }'
```

Depois simule uma saída de 1 unidade:
```bash
curl -X POST http://localhost:8000/api/peso \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_EM_TEXTO_PURO" \
  -d '{"esp32_id":"ESP32_001","balanca_id":"BAL001","peso":0,"timestamp":"2026-09-12T20:31:00"}'
```

Testando o caminho do cliente web (sem token — v2):
```bash
curl http://localhost:8000/api/produtos

curl -X POST http://localhost:8000/api/produtos/1/leitura \
  -H "Content-Type: application/json" \
  -d '{"weight": 8000}'
```

## 11. Como colocar pra rodar

1. Crie o banco: `mysql -u root -p < database/schema.sql`.
2. Gere o hash do token do dispositivo:
   ```
   cd api && npm install
   npm run gerar-hash -- "um-token-forte-aleatorio"
   ```
   Copie o hash gerado para `dispositivos.token_hash` no banco
   (substituindo o placeholder do `schema.sql`).
3. Copie `.env.example` para `.env` e preencha as credenciais do MySQL.
4. `npm start` para subir a API.
5. No firmware `.ino`, preencha SSID/senha do Wi-Fi, IP da API, o
   mesmo token em texto puro, e o fator de calibração. Grave no ESP32.
6. Acompanhe pelo Serial Monitor (115200 baud) e pelos logs da API.
7. Para rodar o cliente web junto: `cd gieci-client && npm install && npm run dev`, e aponte-o para `http://localhost:8000` (ou o IP do servidor na rede) na tela de "Configurar servidor".

## 12. Melhorias futuras

- ~~Painel web consultando `GET /api/produtos`, `/api/movimentacoes` etc.~~ — feito na v2 (`api/src/routes/produtos.js`, `armarios.js`, `prateleiras.js`, `historico.js`), consumido pelo cliente React em `gieci-client/`.
- RFID/QR Code por produto, permitindo várias referências numa mesma balança.
- Rate limiting na API (ex: `express-rate-limit`) para mitigar abuso caso a API fique exposta na internet.
- Job de expurgo automático de `leituras_peso`.
- Autenticação de usuários (login) no painel, usando a tabela `usuarios` — hoje as rotas do cliente web (armários/prateleiras/produtos/leitura manual) não exigem login, só o caminho do ESP32 é autenticado.

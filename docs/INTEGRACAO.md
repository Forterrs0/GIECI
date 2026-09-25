# Integração GIECI / MySQL / ESP32

## Escopo do material recebido

Foram recebidos dois HTMLs idênticos e um documento que descreve o backend. O HTML contém React 19.2.5 embutido, CSS em uma string e dados locais/simulados. O documento menciona arquivos `database/schema.sql` e `api/src/...`, porém esses arquivos não acompanharam o envio.

Esta entrega fornece frontend refatorado e backend de referência executável. Para aproveitar uma API/banco preexistente, compare o schema real e o contrato abaixo. As conversões HTTP estão concentradas em `gieci-client/src/services/api.js` e `api/src/services/dto.js`.

## Campos principais

| Interface / JSON | MySQL | Regra |
|---|---|---|
| `armarios[].id / name` | `armarios.id / nome` | Nome único |
| `prateleiras[].armarioId` | `prateleiras.armario_id` | Nulo significa prateleira avulsa |
| `products[].code` | `produtos.codigo` | Único; gerado se não informado |
| `products[].name / category` | `produtos.nome / categoria` | Texto validado |
| `products[].prateleiraId` | `produtos.prateleira_id` | FK de localização |
| `products[].unitWeight` | `produtos.peso_unitario` | Gramas, maior que zero |
| `products[].currentWeight` | `produtos.peso_atual` | Gramas; fonte autoritativa do estoque |
| `products[].minQuantity` | `produtos.quantidade_minima` | Unidades para alerta |
| `products[].tolerance` | `produtos.tolerancia_peso` | Ruído ignorado apenas no caminho do sensor |
| `products[].version` | `produtos.versao` | Detecta edição manual com estado desatualizado |
| `history[].type` | `movimentacoes.tipo_movimentacao` | `entrada/saida` ↔ `ENTRADA/SAIDA` |
| `history[].quantityChanged` | `movimentacoes.quantidade` | `round(abs(variação)/peso_unitario)` |
| `history[].weightBefore / weightAfter` | `movimentacoes.peso_anterior / peso_atual` | Preserva o peso exato, inclusive frações de unidade |
| `history[].origin / confidence` | `movimentacoes.origem / confianca` | `manual/sensor` e confiança de 0 a 100 |
| `history[].timestamp` | `movimentacoes.data_hora` | Epoch em milissegundos no JSON; UTC no banco |

IDs são strings no JSON, inclusive IDs numéricos do banco. Isso evita incompatibilidades entre os valores dos `<select>` e os relacionamentos, além de perda de precisão com `BIGINT` no histórico.

A quantidade exibida no cartão é derivada do peso e arredondada a uma casa decimal, como no protótipo. A quantidade de uma **movimentação** segue o arredondamento para unidades inteiras descrito no documento do banco. Variações inferiores a meia unidade podem produzir zero unidades estimadas; o peso movimentado continua registrado e visível no relatório. A confiança é calculada como `max(0, 100 × (1 - erro / (peso_unitario / 2)))`, arredondada, limitada a 100. Ela indica a aderência a unidades inteiras; não identifica o produto ou substitui calibração física.

## Autenticação

`POST /api/auth/login` recebe `{ "email": "...", "password": "..." }`. Retorna `{ user, csrfToken }` e cookie HttpOnly. O cliente mantém somente o CSRF em memória.

`GET /api/auth/session` recupera o usuário e CSRF da sessão. `POST /api/auth/logout` revoga a sessão. Cookies duram oito horas, com expiração fixa. As rotas do painel exigem sessão; POST/PATCH/DELETE também exigem `X-CSRF-Token`, `Origin` autorizada e `Content-Type: application/json`.

A rota `/api/peso` usa exclusivamente Bearer de dispositivo, sem cookie/CSRF. Não exige `Origin`, permitindo o ESP32. O token não concede acesso às rotas do painel.

## Rotas

| Método e rota | Entrada / comportamento |
|---|---|
| `GET /api/health` | Verifica conexão com o banco |
| `GET /api/estado?inicio=ISO&fim=ISO` | Snapshot consistente de armários, prateleiras, produtos e contagem do período; o cliente envia o dia atual |
| `GET /api/armarios` | Lista `{id,name}` |
| `POST /api/armarios` | `{name}` |
| `PATCH /api/armarios/:id` | `{name}` |
| `DELETE /api/armarios/:id` | Recusa se houver prateleiras |
| `GET /api/prateleiras` | Lista `{id,name,armarioId}` |
| `POST /api/prateleiras` | `{name,armarioId}`; nulo para avulsa |
| `PATCH /api/prateleiras/:id` | `{name?,armarioId?}` |
| `DELETE /api/prateleiras/:id` | Recusa se houver produtos ativos |
| `GET /api/produtos` | Produtos ativos em formato da interface |
| `POST /api/produtos` | `{name,category,prateleiraId,unitWeight,initialQty,minQuantity,code?,tolerance?}` |
| `PATCH /api/produtos/:id` | `{expectedVersion,name?,category?,prateleiraId?,minQuantity?,tolerance?}` |
| `DELETE /api/produtos/:id` | Desativa produto zerado e sem balança ativa; preserva histórico |
| `POST /api/produtos/:id/leitura` | `{weight,expectedVersion}`; ajuste absoluto manual |
| `POST /api/produtos/:id/ajuste` | `{deltaUnits: 1}` ou `{deltaUnits: -1}`; ajuste relativo atômico |
| `GET /api/historico` | `{items,nextCursor}`; filtros `productId`, `cursor`, `limit` (1–200) |
| `GET /api/movimentacoes` | Alias do histórico |
| `GET /api/relatorios?inicio=ISO&fim=ISO` | Agregação completa por produto; até 370 dias |
| `POST /api/peso` | Contrato ESP32 descrito abaixo |

O cadastro com saldo inicial positivo gera uma movimentação manual de abertura. O `PATCH` não altera diretamente o saldo nem o peso unitário: ajustes de saldo passam pelo serviço que mantém o histórico. Recalibrar o peso unitário de produtos já movimentados exige uma decisão de negócio/migração.

Erros usam `{ "error": "mensagem" }`, com `details` para campos inválidos. Códigos: 400 validação, 401 sessão/token, 403 origem/CSRF, 404 registro, 409 conflito/vínculo/versão, 413 corpo grande, 415 tipo de conteúdo, 429 limite de requisições e 503 indisponibilidade/falha de transação. DELETE bem-sucedido retorna 204.

## Caminho do ESP32

```json
{"esp32_id":"ESP32_001","balanca_id":"BAL001","peso":1000.5,"timestamp":"2026-09-16T14:30:00-03:00"}
```

O corpo é validado, o token bcrypt autentica o dispositivo e a balança precisa pertencer a esse dispositivo. Dentro da transação, a balança e o produto são bloqueados. Leituras com instante menor ou igual à última leitura da balança ou à última atualização/confirmação manual do produto retornam:

```json
{"sucesso":true,"ignorada":true,"motivo":"leitura_antiga_ou_repetida","peso_atual":1000}
```

Uma leitura válida com variação inferior à tolerância retorna `motivo: "ruido"`; peso idêntico retorna `sem_alteracao`. Ambas atualizam a referência temporal e registram a leitura bruta aceita, preservando `produtos.peso_atual`. Leituras antigas/repetidas não geram outra linha bruta. Uma movimentação retorna:

```json
{"sucesso":true,"movimentacao":"SAIDA","produto":"Arroz 1kg","quantidade":1,"peso_anterior":2000,"peso_atual":1000,"variacao":-1000,"confianca":100}
```

Apenas comparar pesos, como sugeria uma passagem do documento recebido, não impede que uma fila antiga reverta o estoque. Por isso foi incluída a verificação temporal. O relógio do ESP32 deve estar sincronizado; uma leitura por balança no mesmo instante é tratada como repetida. Os pesos aceitam três casas decimais, de zero a 1.000.000.000 gramas.

## Extensões do schema descrito

Além das oito tabelas citadas no documento, foram incluídas `sessoes` e `schema_migrations`. Foram explicitados campos para login, expiração, `ativo`, versão do produto, instante da última atualização, origem e cópia do nome do produto no histórico. A restrição única em `balancas.produto_id` representa uma balança por produto.

O schema foi exercitado em um MySQL novo. A aplicação não detecta/migra automaticamente todas as variantes possíveis do banco anterior. O instalador protege bancos com tabelas desconhecidas, mas o arquivo SQL deve ser aplicado somente após selecionar e conferir o banco correto.

## Referências técnicas

- [Segurança em produção — Express](https://expressjs.com/en/advanced/best-practice-security/)
- [Consultas preparadas e pools — MySQL2](https://sidorares.github.io/node-mysql2/docs)
- [Instalação e compilação — Vite](https://vite.dev/guide/)

O documento recebido foi conservado em `modelo-recebido.md` para comparação. As rotas autenticadas e regras efetivas desta entrega estão documentadas acima.

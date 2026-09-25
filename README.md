# GIECI — projeto organizado

O projeto foi separado em HTML, React, CSS, serviços de dados e API Node.js/Express com MySQL. A paleta, as famílias **Space Grotesk / IBM Plex Sans / IBM Plex Mono** e o desenho dos componentes do HTML recebido foram preservados. As fontes agora acompanham o projeto, sem depender do Google Fonts para abrir a interface.

## Abrir rapidamente a demonstração

Instale **Node.js 22.12 ou superior**. Extraia o ZIP, abra a pasta `gieci` no VS Code e execute no terminal:

```bash
npm ci
npm run demo
```

Abra **http://127.0.0.1:5173**. A demonstração funciona sem banco e sem login. Cadastros e simulações ficam no navegador. O armazenamento usa a chave do protótipo (`gieci-estoque-v1`), permitindo reutilizar dados válidos quando ambos rodam na mesma origem. Arquivos abertos por `file://` e outras portas/origens têm armazenamentos diferentes.

Para testar no celular, conectado à mesma rede do computador:

```bash
npm run demo:lan
```

No celular, abra `http://IP_DO_COMPUTADOR:5173`. Libere a porta 5173 no firewall da sua rede se necessário. Para a versão com banco, use `npm run dev:lan` e acrescente essa origem exata em `api/.env`.

Os fontes React usam importações e compilação. Abra pelo servidor acima. O duplo clique em `index.html` não executa módulos JSX.

## Onde editar

| Caminho | Responsabilidade |
|---|---|
| `gieci-client/index.html` | Estrutura HTML, metadados e ponto de montagem |
| `gieci-client/src/main.jsx` | Inicialização do React e importação das fontes/CSS |
| `gieci-client/src/App.jsx` | Estado da navegação, ações e composição das telas |
| `gieci-client/src/components/` | Painel, produtos, cadastro, organização, histórico, relatórios, login e ícones |
| `gieci-client/src/styles/original.css` | Estilos originais, sem importação externa de fontes |
| `gieci-client/src/styles/extracted.css` | Estilos que antes estavam embutidos no React |
| `gieci-client/src/styles/responsive.css` | Ajustes de tamanho, teclado, foco e telas pequenas |
| `gieci-client/src/hooks/` | Sincronização, estados de erro e consultas |
| `gieci-client/src/services/api.js` | Contrato de comunicação com o servidor |
| `gieci-client/src/services/demoStore.js` | Demonstração e persistência local |
| `api/src/routes/` | Autenticação, cadastros e consultas HTTP |
| `api/src/services/movement.js` | Estoque, tolerância, transações e leituras dos sensores |
| `database/schema.sql` | Schema de referência executável |
| `api/.env.example` | Modelo das configurações privadas do servidor |
| `docs/INTEGRACAO.md` | Contrato de dados, rotas e diferenças em relação ao documento recebido |
| `docs/VALIDACAO.md` | Verificações realizadas e limites da validação |

## Usar com MySQL

A integração segue o documento Markdown anexado: armário → prateleira → produto, `produtos.peso_atual` como fonte do estoque, histórico de movimentações e ESP32 autenticado por token Bearer. **O anexo descreve o banco, mas não contém o `schema.sql` nem o backend existentes.** O SQL entregue é uma implementação de referência desse modelo. A conexão com um banco já existente exige comparar os nomes/tipos reais e planejar a migração. Nenhum banco externo foi acessado ou alterado.

### 1. Criar o banco

Use MySQL **8.0.16+**, preferencialmente uma versão com atualizações do fornecedor. No MySQL Workbench ou cliente de administração, crie um banco novo:

```sql
CREATE DATABASE gieci CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gieci;
```

Abra e execute `database/schema.sql` nesse banco. O script não inclui dados de exemplo, senhas ou tokens. Crie um usuário exclusivo para a aplicação, com uma senha própria:

```sql
CREATE USER 'gieci_app'@'localhost' IDENTIFIED BY 'SUBSTITUA_POR_UMA_SENHA_FORTE';
GRANT SELECT, INSERT, UPDATE, DELETE ON gieci.* TO 'gieci_app'@'localhost';
```

Se o Node e o MySQL estiverem em máquinas diferentes, ajuste o host autorizado desse usuário ao endereço do servidor da aplicação.

Existe também `npm run db:init`, que instala o schema em um banco novo usando as credenciais de `api/.env`. Nesse caso, o usuário usado na instalação precisa poder criar o banco/tabelas. Depois da instalação, use um usuário apenas com as permissões de execução acima. O instalador recusa um banco já preenchido que não tenha a versão reconhecida deste projeto.

### 2. Configurar o servidor

Copie `api/.env.example` para `api/.env` e preencha host, porta, banco, usuário e senha. No PowerShell:

```powershell
Copy-Item api/.env.example api/.env
```

No Linux/macOS:

```bash
cp api/.env.example api/.env
```

As variáveis do MySQL pertencem exclusivamente a `api/.env`. Nunca coloque senhas ou tokens em arquivos `VITE_*`, no React ou no Git. O `.gitignore` já exclui os arquivos privados.

### 3. Criar o usuário do painel

```bash
npm run user:create
```

O comando solicita nome, e-mail e senha no terminal. A senha deve ter ao menos 12 caracteres e é armazenada como hash bcrypt. Não existe usuário ou senha padrão. Todos os usuários ativos cadastrados têm o mesmo acesso aos cadastros e às movimentações nesta versão.

### 4. Executar frontend e backend

```bash
npm run dev
```

Abra **http://127.0.0.1:5173** e entre com o usuário criado. O frontend encaminha `/api` ao servidor na porta 8000. O banco começa vazio: cadastre armários/prateleiras e os produtos.

No painel real, os botões de adicionar/retirar e ajustar peso registram **movimentações manuais reais**. A simulação automática e a restauração dos exemplos pertencem exclusivamente ao modo de demonstração.

O painel atualiza o estoque a cada cinco segundos. O histórico é paginado, com botão para carregar mais e atualização explícita. Os relatórios consultam todo o período no servidor, independentemente das páginas abertas no histórico.

## Conectar o ESP32

Depois de cadastrar um produto, abra **Ajustar peso** no cartão para consultar seu ID e código. Execute:

```bash
npm run device:create
```

Informe identificador do ESP32, identificador da balança e ID do produto. O comando cria o vínculo e exibe um token aleatório uma vez. Guarde-o no firmware. O banco armazena somente o hash.

A rota permanece:

```http
POST /api/peso
Authorization: Bearer TOKEN_DO_DISPOSITIVO
Content-Type: application/json
```

```json
{
  "esp32_id": "ESP32_001",
  "balanca_id": "BAL001",
  "peso": 1000.5,
  "timestamp": "2026-09-16T14:30:00-03:00"
}
```

Use o instante real da leitura. São aceitas datas ISO 8601 com `Z`/offset e o formato sem offset descrito no documento original, interpretado como Brasília (`-03:00`). Datas futuras além de cinco minutos são rejeitadas. Leituras antigas ou repetidas são ignoradas sem alterar o estoque. O firmware, a conexão elétrica e a calibração não foram fornecidos; não foram modificados nem testados fisicamente.

Cada produto admite uma balança neste modelo. Para revogar o dispositivo, um administrador pode definir `dispositivos.ativo=0`. Para desvincular a operação de uma balança antes de remover um produto, defina `balancas.ativo=0`. O comando `device:create` cria vínculos novos e recusa duplicados; a troca de vínculos ou tokens existentes deve ser feita pelo administrador do banco, preservando o histórico.

## Gerar a versão de distribuição

```bash
npm run build
npm start
```

Abra **http://localhost:8000**. A API serve o frontend compilado de `gieci-client/dist`. O ZIP já inclui esse diretório, e o comando acima o recria após alterações.

Para uma demonstração estática independente do banco:

```bash
npm run build:demo
```

O resultado vai para `gieci-client/dist-demo`. Essa pasta pode ser publicada em hospedagem estática. Para o sistema real, a hospedagem precisa executar a API Node e alcançar o MySQL; subir somente o HTML em uma hospedagem estática não disponibiliza o backend.

Em produção, configure `NODE_ENV=production`, domínio HTTPS em `ALLOWED_ORIGINS`, credenciais privadas e um proxy HTTPS. O servidor exige cookie seguro em produção. Configure `TRUST_PROXY` somente para o IP do seu proxy. O navegador usa `/api` na mesma origem do frontend. Para MySQL remoto com TLS, configure `DB_SSL_CA` com o certificado da autoridade confiável.

## Testes reproduzíveis

```bash
npm test
npm run build
npm run build:demo
npx playwright install chromium
npm run test:ui
```

`npm run test:database` usa as variáveis `DB_HOST`, `DB_PORT`, `DB_USER` e `DB_PASSWORD` do ambiente do terminal. Cria e remove apenas um banco temporário chamado `gieci_test_<identificador>`. O usuário de teste precisa poder criar/remover esse banco. Esse comando não usa `DB_NAME` nem limpa o banco da aplicação.

Para incluir o navegador conectado à API e ao MySQL no teste de integração, defina `RUN_BROWSER_TESTS=1` antes de `npm run test:database` e gere `npm run build`. Os testes de navegador usam Chromium; a comparação em aparelhos físicos/iOS permanece uma etapa de implantação.

## Segurança implementada

- Login obrigatório na API do painel, sessão revogável, cookie HttpOnly/SameSite e expiração de oito horas.
- Token CSRF em memória e origem explícita para operações do navegador.
- Credencial bcrypt própria para cada dispositivo e conferência do vínculo balança/dispositivo.
- Validação de tipos, limites, IDs e precisão numérica antes das consultas parametrizadas.
- Transações e bloqueio do produto para atualizar peso e histórico juntos.
- Controle de versão em leituras manuais absolutas; ajustes de uma unidade são calculados atomicamente no servidor.
- Histórico preservado ao remover produtos. Exclusão exige saldo zerado e balança desativada.
- Política CSP sem scripts/estilos inline, cabeçalhos de proteção, limite de tamanho de JSON e limite de requisições.
- Falhas de rede e de armazenamento exibidas na interface; indisponibilidade da API não ativa dados fictícios.

A separação dos arquivos melhora manutenção e cache. Os controles acima são a parte efetiva da proteção dos dados. Backups, acesso ao servidor, HTTPS e atualização das dependências continuam sendo configurações da implantação. O limitador em memória foi preparado para uma instância da API; uma implantação com várias réplicas deve usar um armazenamento compartilhado para esse limitador.

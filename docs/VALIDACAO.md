# Validação desta entrega

Data: 16/09/2026.

Ambiente utilizado: Node.js 24.19.0, MySQL 8.0.46 e Chromium 153 em execução local. O MySQL foi iniciado com dados temporários exclusivos para testar o schema e a API; não foi usada uma conexão externa do usuário.

| Verificação | Resultado |
|---|---|
| Compilação para API (`npm run build`) | Aprovada |
| Compilação da demonstração (`npm run build:demo`) | Aprovada |
| Testes de regras, validação e datas (`npm test`) | 5 aprovados |
| Testes de navegador da demonstração (`npm run test:ui`) | 6 aprovados |
| API + MySQL + navegador conectado | 9 cenários aprovados; o runner apresenta 10 testes contando o grupo principal |
| Instalação do schema e repetição do instalador | Schema aplicado; segunda execução preserva os dados |
| Comparação visual de 14 elementos principais do desktop | Mesmos valores computados de cor, fundo, fonte, tamanho de fonte, peso de fonte, posição e dimensões |

A comparação visual utilizou os mesmos arquivos de fonte nas duas versões, substituindo apenas o carregamento externo das fontes do original. Isso permite comparar o desenho independentemente da disponibilidade do Google Fonts. As mensagens de conexão/armazenamento foram atualizadas para informar o modo real de funcionamento.

## Fluxos exercitados

- Todas as cinco abas nas larguras de **320, 375, 768 e 1440 pixels**, sem transbordamento horizontal da página. A tabela de relatórios utiliza rolagem interna em telas pequenas.
- Cadastro e edição de armário, cadastro de prateleira e produto, adição/retirada, peso manual, histórico, relatórios, persistência após recarga e exclusão de produto zerado.
- Erro explícito quando o armazenamento local está bloqueado/cheio, sem indicar uma gravação falsa.
- Login, sessão, CSRF, restrição de origem, logout e recusa de acesso sem autenticação.
- Vínculos de tabelas, nomes duplicados, inputs inválidos e nomes contendo texto semelhante a SQL, tratados como dados.
- Dez ajustes concorrentes no mesmo produto sem perder atualizações.
- Rollback ao provocar uma falha de gravação: estoque e histórico permanecem consistentes.
- Bearer do ESP32, vínculo com a balança, tolerância, repetição e ordem temporal das leituras.
- Confirmação manual sem mudança de peso também impede que uma leitura antiga reverta o estoque.
- Paginação do histórico e relatório completo com mais de cem registros, incluindo produto renomeado.
- Interface real conectada ao MySQL: login, cadastro, ajuste decimal, recarga, histórico, relatório, falha de rede, recuperação e saída.
- Ausência de erros JavaScript de página e de violações de CSP nos fluxos reais exercitados.

A mensagem `ER_SIGNAL_EXCEPTION` no teste de integração é uma falha provocada deliberadamente para conferir o rollback. O caso deve terminar aprovado.

## Limites da verificação

O schema SQL original, o backend anterior, as credenciais do banco externo e o firmware não foram enviados. A compatibilidade foi validada entre o frontend, a API e o schema que acompanham esta entrega, seguindo o modelo conceitual do documento recebido. A adaptação a outro schema existente precisa ser conferida com seu SQL real.

O ESP32 foi simulado por requisições HTTP com o contrato documentado. Não houve teste elétrico, calibração, teste em balança física ou validação em aparelhos iOS/Android reais. Os testes de largura foram feitos no Chromium. A entrega inclui controles de segurança e testes funcionais; não constitui garantia de ausência de falhas em qualquer hospedagem ou uma auditoria de segurança completa.

Pré-visualizações locais: `preview-desktop.png` e `preview-mobile.png`.

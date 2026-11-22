# Hospital Sentinela — versão estilizada

## Estrutura
- `frontend/`: páginas HTML e arquivos CSS separados.
- `backend/server.js`: API Express usada pelo comando de inicialização.
- `backend/db.json`: arquivo de dados de exemplo usado apenas pela versão alternativa `api/index.js`; o servidor principal atual mantém dados em memória.
- `api/index.js`: implementação alternativa antiga, não é iniciada pelo Render neste projeto.
- `render.yaml`: configuração sugerida de deploy.

## Rodar localmente
1. Instale Node.js 18 ou superior.
2. Abra a pasta do projeto no terminal.
3. Execute `npm install`.
4. Execute `npm start`.
5. Acesse `http://localhost:3000`.

## Publicar no Render
1. Envie esta pasta para um repositório Git.
2. No Render, crie um **Web Service** conectado ao repositório.
3. Use `npm install` como Build Command e `npm start` como Start Command.
4. O serviço usa `process.env.PORT` e escuta em `0.0.0.0`; a rota `/health` serve para health check.

## Acesso demonstrativo
- atendimento / 123
- triagem / 123
- medico / 123
- admin / 123

## Importante sobre dados
O backend principal (`backend/server.js`) guarda pacientes, triagens, consultas e chamadas da TV **somente em memória**. Isso serve para demonstração/testes, mas os dados são perdidos quando o processo reinicia ou o serviço é redeployado. O disco local do Render também não deve ser tratado como banco permanente sem configurar um Persistent Disk ou, preferencialmente, um banco gerenciado (por exemplo PostgreSQL) e adaptar as rotas.

Os logins e senhas são demonstrativos e não possuem autenticação segura. Não utilize dados reais de pacientes, informações clínicas identificáveis ou este projeto como prontuário em produção sem implementar autenticação, controle de acesso, auditoria, proteção de dados e armazenamento adequado conforme a legislação aplicável.

## Observações
- Os arquivos CSS estão separados por tela e compartilham `frontend/css/theme.css`.
- A tela de alta mantém a impressão pelo navegador.
- O PDF gerado pelo backend continua usando PDFKit.

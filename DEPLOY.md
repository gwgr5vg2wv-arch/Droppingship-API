# Deploy pelo GitHub e Render

Este projeto usa:

```powershell
npm start
```

com o script `start` apontando para `node server/index.js`.

## Primeira configuracao

Configure o repositorio GitHub uma vez:

```powershell
powershell -ExecutionPolicy Bypass -File .\configurar-git.ps1 -Repositorio "https://github.com/USUARIO/REPOSITORIO.git"
```

Confira o remote configurado:

```powershell
git remote -v
```

Confira a branch atual:

```powershell
git branch --show-current
```

## Atualizacao normal

Use o PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\atualizar.ps1 -Mensagem "Minha atualizacao"
```

Ou de dois cliques em:

```text
atualizar.bat
```

O script instala dependencias, executa `npm run check` se existir, executa `npm test` se existir, cria o commit quando houver alteracoes e faz `git push`.

## Verificacao opcional do Render

Para tentar consultar a aplicacao depois do push, configure uma variavel de ambiente com a URL de health:

```powershell
setx RENDER_HEALTH_URL "URL_DA_ROTA_HEALTH"
```

Exemplo de formato:

```powershell
setx RENDER_HEALTH_URL "https://seu-servico.onrender.com/Droppingship/api/health"
```

Depois de configurar, abra um novo terminal para a variavel ficar disponivel.

## O que o push faz

O push atualiza o GitHub.

O Render atualiza automaticamente apenas quando o servico estiver conectado ao repositorio e com Auto-Deploy ativado.

File Manager, FTP ou painel de hospedagem nao sao atualizados automaticamente com `git push`.

## Cuidados

Nao envie `.env` ao GitHub. Use variaveis de ambiente no Render para senhas, tokens e chaves.

O arquivo `.gitignore` ja ignora `.env`, `node_modules/`, logs, `coverage/`, `deploy-temp/` e `frontend-atualizado.zip`.

## ZIP opcional do frontend

Como existe pasta `public`, voce pode gerar um ZIP do frontend com:

```powershell
powershell -ExecutionPolicy Bypass -File .\gerar-frontend-zip.ps1
```

Esse ZIP compacta apenas o conteudo interno de `public`.

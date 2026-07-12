# Deploy no Render

## 1. Banco PostgreSQL

1. Crie um PostgreSQL no Render.
2. Copie a Internal Database URL para `DATABASE_URL`.
3. Nunca use SQLite em producao.

## 2. Variaveis obrigatorias

Configure no Render:

```text
NODE_ENV=production
PORT=10000
APP_URL=https://SEU_SERVICO.onrender.com
FRONTEND_URL=https://SEU_DOMINIO
DATABASE_URL=postgresql://...
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
ENCRYPTION_KEY=
SESSION_SECRET=
COOKIE_NAME=ds_refresh
COOKIE_DOMAIN=
EMAIL_PROVIDER=none
EMAIL_FROM=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
MARKETPLACE_WRITE_ENABLED=false
AI_PATCH_ENABLED=false
AUTO_APPLY_PATCHES=false
```

Configure tambem as credenciais das integracoes somente quando os apps oficiais estiverem criados.

## 3. Build command

```bash
npm install && npm run db:generate && npm run build
```

## 4. Start command

```bash
npm start
```

## 5. Migrations

Depois que `DATABASE_URL` estiver configurada:

```bash
npm run db:migrate:deploy
```

## 6. URLs OAuth

Mercado Livre:

```text
https://SEU_DOMINIO/Droppingship/api/integrations/oauth/mercadoLivre/callback
```

AliExpress:

```text
https://SEU_DOMINIO/Droppingship/api/integrations/oauth/aliexpress/callback
```

## 7. Health checks

Use:

```text
/health/live
/health/ready
/Droppingship/api/health/ready
```

`ready` retorna 503 quando banco, segredos ou migrations nao estiverem prontos. Isso e esperado antes de configurar o PostgreSQL e aplicar migrations.

## 8. Escrita em marketplaces

Mantenha:

```text
MARKETPLACE_WRITE_ENABLED=false
```

Isso permite leitura e validacao, mas bloqueia publicacao, alteracao, pausa, reativacao e cancelamento.

Altere para `true` somente depois de testes, credenciais, permissoes e aprovacao humana.

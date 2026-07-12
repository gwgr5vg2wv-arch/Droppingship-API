# Configuracao local

## Instalar

```bash
npm install
```

## Variaveis obrigatorias

Copie `.env.example` para `.env` e configure:

```bash
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
ENCRYPTION_KEY=
SESSION_SECRET=
COOKIE_NAME=ds_refresh
COOKIE_DOMAIN=
FRONTEND_URL=http://localhost:3000
APP_URL=http://localhost:3000
EMAIL_PROVIDER=none
```

## Banco

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

## Rodar

```bash
npm run dev
```

Abra `http://localhost:3000/Droppingship/bot.html`.

## Testes

```bash
npm run lint
npm run build
npm test
```

Para validar banco isolado:

```bash
TEST_DATABASE_URL=postgresql://usuario:senha@localhost:5432/droppingship_test npm run test:integration
```

Se `/health/ready` retornar 503, confira `DATABASE_URL`, segredos, conexao com PostgreSQL e migrations.

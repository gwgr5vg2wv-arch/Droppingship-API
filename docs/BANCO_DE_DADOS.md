# Banco de dados

## PostgreSQL local

```bash
createdb droppingship_dev
cp .env.example .env
```

Configure no `.env`:

```bash
DATABASE_URL=postgresql://usuario:senha@localhost:5432/droppingship_dev
JWT_SECRET=use-um-segredo-com-32-caracteres-ou-mais
JWT_REFRESH_SECRET=use-outro-segredo-com-32-caracteres-ou-mais
ENCRYPTION_KEY=use-uma-chave-com-32-caracteres-ou-mais
SESSION_SECRET=use-um-segredo-de-sessao-com-32-caracteres
```

Depois execute:

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

## Modelos

Implementados no Prisma: `User`, `Workspace`, `WorkspaceMember`, `UserSession`, `PasswordResetToken`, `EmailVerificationToken` e `AuditLog`.

Preparados para fases seguintes: `Integration`, `ProductSource`, `ProductResearch`, `SavedProduct`, `Listing`, `Order`, `OrderItem`, `AutomationRule`, `ErrorEvent` e `AIPatch`.

## Readiness

`GET /health/ready` retorna 503 quando `DATABASE_URL` falta, quando o banco nao conecta, quando segredos criticos faltam ou quando migrations possuem rollback registrado.

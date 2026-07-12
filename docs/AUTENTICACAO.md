# Autenticacao

## Rotas

- `POST /Droppingship/api/auth/register`
- `POST /Droppingship/api/auth/login`
- `POST /Droppingship/api/auth/refresh`
- `POST /Droppingship/api/auth/logout`
- `POST /Droppingship/api/auth/logout-all`
- `GET /Droppingship/api/auth/sessions`
- `DELETE /Droppingship/api/auth/sessions/:sessionId`
- `POST /Droppingship/api/auth/forgot-password`
- `POST /Droppingship/api/auth/reset-password`
- `POST /Droppingship/api/auth/send-verification`
- `POST /Droppingship/api/auth/verify-email`
- `GET /Droppingship/api/users/me`
- `PATCH /Droppingship/api/users/me`
- `PATCH /Droppingship/api/users/me/password`
- `DELETE /Droppingship/api/users/me`

## Fluxo

O cadastro normaliza email, valida senha forte, cria usuario, workspace inicial, membro owner, sessao persistente e `AuditLog` em transacao Prisma.

O login usa resposta generica para credenciais invalidas, incrementa falhas, bloqueia por 15 minutos apos 5 falhas, cria sessao persistente e salva apenas hash do refresh token.

O refresh token e rotativo. Reuso ou divergencia de hash revoga a sessao como comprometida.

O refresh fica em cookie HttpOnly. O access token e retornado para uso em memoria no frontend, sem `localStorage`.

## Email

`EMAIL_PROVIDER=none` permite desenvolvimento com log seguro. Em producao, rotas que dependem de email retornam erro de configuracao quando nao ha provedor real.

# Workspaces e permissoes

## Rotas

- `GET /Droppingship/api/workspaces`
- `POST /Droppingship/api/workspaces`
- `GET /Droppingship/api/workspaces/:workspaceId`
- `PATCH /Droppingship/api/workspaces/:workspaceId`
- `GET /Droppingship/api/workspaces/:workspaceId/members`
- `POST /Droppingship/api/workspaces/:workspaceId/invitations`
- `PATCH /Droppingship/api/workspaces/:workspaceId/members/:memberId`
- `DELETE /Droppingship/api/workspaces/:workspaceId/members/:memberId`

## Papeis

- `owner`: acesso total.
- `admin`: gerencia workspace e equipe.
- `operator`: operacao limitada.
- `viewer`: leitura.

As rotas usam `requireAuth`, `requireWorkspace`, `requireRole` e `requirePermission`. O workspace e sempre validado contra a membership do usuario autenticado para evitar acesso por IDs alterados.

O ultimo `owner` nao pode ser removido nem rebaixado sem transferencia previa.

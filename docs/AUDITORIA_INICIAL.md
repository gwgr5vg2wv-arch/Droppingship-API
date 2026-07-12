# Auditoria inicial

Data: 2026-07-10
Branch de trabalho: `feature/saas-dropshipping-real`
Backup Git: `25e29a9 Backup antes da transformacao SaaS`

## Arquitetura atual

- Backend: Node.js + Express em ESM, entrada real em `server/index.js`.
- Frontend: aplicacao estatica em `public/`, servida pelo proprio Express em `/Droppingship`.
- API local: prefixo `/Droppingship/api`.
- API de producao legada: prefixo `/drop/Droppingship/api`.
- Persistencia atual: JSON local em `server/data/db.json` e `server/data/leads.json`.
- Testes: `node --test` em `test/search.test.js`.
- Busca real atual: providers em `src/services/search/providers`.
- Integracoes marketplace: clientes em `server/marketplaces`.
- Scripts atuais: `dev`, `start`, `test`, `check`.

## Rotas atuais

- `GET /Droppingship/health`
- `GET /Droppingship/api/health`
- `GET /drop/Droppingship/api/health`
- `GET /Droppingship/api/dashboard/summary`
- `POST /Droppingship/api/bot/scan`
- `GET /Droppingship/api/products`
- `GET /Droppingship/api/products/search`
- `POST /Droppingship/api/products/save`
- `POST /Droppingship/api/products/publish-queue`
- `POST /Droppingship/api/products/public-search`
- `POST /Droppingship/api/products/search-real`
- `POST /Droppingship/api/products/refresh`
- `POST /Droppingship/api/products/publish`
- `GET /Droppingship/api/products/:id`
- `GET /Droppingship/api/orders`
- `GET /Droppingship/api/orders/sync`
- `GET /Droppingship/api/finance/summary`
- `GET|POST /Droppingship/api/settings`
- `GET /Droppingship/api/integrations/status`
- `GET /Droppingship/api/integrations/oauth/:marketplace/start`
- `GET /Droppingship/api/integrations/oauth/:marketplace/callback`
- `GET /Droppingship/api/trends`
- `GET|POST /Droppingship/api/system-credentials`
- `GET /Droppingship/api/system-credentials/status`
- `GET /Droppingship/api/system-credentials/test/mercadolivre`
- `GET /Droppingship/api/debug/network`
- `GET /Droppingship/api/debug/mercadolivre`
- `GET /Droppingship/api/debug/last-error`
- `GET /Droppingship/api/search/providers/status`

## Variaveis de ambiente identificadas

- Aplicacao: `NODE_ENV`, `PORT`
- URLs e deploy: `DATABASE_URL`, `RENDER_HEALTH_URL`
- Mercado Livre: `MERCADO_LIVRE_CLIENT_ID`, `MERCADO_LIVRE_CLIENT_SECRET`, `MERCADO_LIVRE_REDIRECT_URI`, `MERCADO_LIVRE_ACCESS_TOKEN`
- AliExpress: `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`, `ALIEXPRESS_REDIRECT_URI`, `ALIEXPRESS_ACCESS_TOKEN`
- Google Custom Search: `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX`
- SerpAPI: `SERPAPI_API_KEY`
- RapidAPI: `RAPIDAPI_KEY`, `RAPIDAPI_HOST`
- Shopee/TikTok/Temu: variaveis existem em codigo, mas as integracoes nao estao completas para producao.
- IA: `OPENAI_API_KEY`
- Calculo: `DEFAULT_MARKUP_PERCENT`, `MARKETPLACE_FEE_PERCENT`, `ADS_RESERVE_PERCENT`, `MINIMUM_PROFIT`, `DEFAULT_MARKETPLACE_FEE_PERCENT`
- Busca: `SEARCH_CACHE_TTL_MS`, `SEARCH_PROVIDER_TIMEOUT_MS`

## Fontes reais aproveitaveis

- Mercado Livre: provider publico em `src/services/search/providers/mercadolivre.provider.js` e cliente OAuth/API em `server/marketplaces/mercadoLivre.client.js`.
- Google Programmable Search: provider condicionado a credenciais.
- SerpAPI: provider condicionado a `SERPAPI_API_KEY`.
- RapidAPI: provider condicionado a `RAPIDAPI_KEY` e `RAPIDAPI_HOST`.
- AliExpress: cliente preparado para Open Platform/Affiliate, mas ainda sem assinatura, normalizacao completa e validacao de permissao.

## Problemas encontrados

- Nao existe banco PostgreSQL nem migrations.
- Nao existe Prisma ou outro ORM.
- Persistencia em JSON local nao atende SaaS multiusuario nem producao.
- Tokens e credenciais podem ser salvos em JSON local, sem criptografia forte obrigatoria.
- Nao existe autenticacao, sessao, refresh token, recuperacao de senha ou RBAC.
- Nao existe isolamento por `workspaceId`.
- Nao existe camada de assinatura/limites por plano.
- `MARKETPLACE_WRITE_ENABLED` ainda nao bloqueia escrita em todos os pontos.
- Nao existe validacao centralizada de variaveis de ambiente.
- Health check atual e simples e nao informa banco, cache, fila ou modulos indisponiveis.
- CORS esta aberto com `cors()` sem lista restrita.
- Nao ha Helmet, cookies seguros, CSRF, nem rate limit global.
- Rate limit existe apenas em busca de produtos e em memoria.
- Logs nao sao estruturados.
- Central de Erros ainda nao existe como modulo persistente.
- Jobs/filas/automacoes ainda nao existem.
- Frontend tem telas operacionais, mas nao possui login, cadastro, onboarding, equipe, planos, admin, consentimento legal ou editor completo de anuncio.
- `public/assets/js/debug.js` referencia `DroppingshipApi.opportunities`, que nao existe em `api.js`.
- `systemCredentials` permite salvar credenciais pelo painel em armazenamento local; isso nao e adequado para producao.
- `server/data/leads.json` ainda e arquivo local sem modelo de banco.
- Shopee, TikTok, Temu e Amazon nao devem ser apresentados como integracoes prontas.
- AliExpress esta preparado parcialmente, aguardando credenciais, assinatura e autorizacao de API.
- `src/server.js` apenas importa `server/index.js`; existe por compatibilidade, mas a entrada real e `server/index.js`.

## Mocks, simulacoes e dados estaticos encontrados

- Nao ha provider de mock ativo em producao apos a limpeza anterior.
- Foram encontrados campos e nomes legados como `fallbackResults`, `isFallback` e `fallbackUsed`; hoje eles funcionam como marcadores de ausencia/compatibilidade, mas devem ser renomeados para termos de estado real em uma migracao posterior.
- `server/services/dataStore.service.js` ainda usa `Math.random` para ids locais. Isso deve ser trocado por UUID/ids do banco.
- Dashboard ainda expoe chaves legadas `simulatedOrders` e `simulatedFees` com zero para compatibilidade do frontend. Devem ser removidas quando a UI migrar para contratos finais.
- `setupApis.js` contem URL de callback fixa de producao em texto; deve ser derivada de `APP_URL`.
- `server/connectors/mercadolivre.js` parece redundante com os providers/clientes reais.

## Imports e rotas quebradas

- `public/assets/js/debug.js` chama `window.DroppingshipApi.opportunities`, que nao existe.
- A rota `/products/:id` busca produto por chamada agregada com query generica quando nao ha produto em cache; isso pode retornar 404 mesmo para item salvo.
- Nao ha endpoints sugeridos pela especificacao para `integrations/mercadolivre/connect`, `disconnect`, `refresh` e `account`.
- Nao ha endpoints finais para auth, users, workspaces, subscriptions, admin, audit, jobs e error-center.

## Dependencias nao utilizadas ou insuficientes

- `openai` e usado apenas se `OPENAI_API_KEY` existir.
- Falta `helmet`, `express-rate-limit`, `cookie-parser`, `bcryptjs`, `jsonwebtoken`, `zod`, `@prisma/client`, `prisma` e cliente PostgreSQL/Redis se forem adotados.
- Nao existe lint/formatter.

## Problemas de seguranca

- Sem autenticacao: qualquer pessoa que acesse a API pode salvar produtos, configurar credenciais, consultar status e tentar publicar.
- Sem autorizacao por papel.
- Sem isolamento de workspace.
- Credenciais podem ser persistidas localmente.
- Tokens OAuth podem ser armazenados em texto puro.
- CORS aberto.
- Sem Helmet.
- Sem protecao CSRF.
- Sem auditoria persistente.
- Sem mascaramento estruturado em todos os logs.
- Sem bloqueio global de escrita em marketplaces por env.

## Funcionalidades aproveitaveis

- Servidor Express simples e funcional.
- Frontend estatico ja servido pela API.
- Providers reais de busca agregada.
- Normalizacao de produtos e validacao de imagens ja existem.
- Scripts de deploy Git/Render ja foram criados.
- Testes de busca e normalizacao existem.
- Clientes marketplace servem como ponto de partida para camada oficial.

## Funcionalidades incompletas

- SaaS multiusuario.
- Banco PostgreSQL.
- Prisma/migrations.
- Autenticacao e RBAC.
- Mercado Livre OAuth seguro com state, criptografia e refresh robusto.
- AliExpress real autorizado.
- Editor de anuncio.
- Publicacao assistida com preview e confirmacao.
- Jobs, filas e webhooks.
- Central de Erros com IA.
- Planos comerciais e limites.
- Painel administrativo.
- Termos, privacidade, cookies e consentimento.

## Riscos

- Risco alto: credenciais em JSON local se usadas em producao.
- Risco alto: API sem autenticacao.
- Risco alto: escrita em marketplace nao centralmente bloqueada por `MARKETPLACE_WRITE_ENABLED`.
- Risco medio: chamadas publicas podem ser bloqueadas por 403/429 e devem ser tratadas sem retry agressivo.
- Risco medio: frontend tem botoes de integracoes futuras que podem sugerir suporte maior do que existe.
- Risco medio: falta de banco impede isolamento e auditoria.

## Plano de migracao

1. Criar configuracao central de ambiente com defaults seguros.
2. Adicionar middlewares de seguranca: Helmet, CORS configuravel, rate limit e request id.
3. Criar health checks completos.
4. Introduzir Prisma/PostgreSQL com schema inicial e migrations.
5. Criar modulo de criptografia de tokens.
6. Implementar auth, users, sessions e workspaces.
7. Migrar persistencia JSON para repositories Prisma.
8. Proteger rotas com workspaceId e RBAC.
9. Reestruturar Mercado Livre com OAuth state, refresh, account, categorias e modo de escrita seguro.
10. Preparar AliExpress somente como integracao aguardando autorizacao/credenciais ate documentacao e acesso real.
11. Criar audit logs e error events.
12. Migrar frontend para telas SaaS: login, onboarding, dashboard real, integracoes, editor, error center e admin.

## Ordem de implementacao recomendada

1. Fase 1: ambiente, seguranca, health, Prisma schema, auth/workspaces basicos.
2. Fase 2: Mercado Livre leitura/OAuth/status com escrita bloqueada por padrao.
3. Fase 3: AliExpress autorizado e status real.
4. Fase 4: pesquisa, produtos salvos, pricing e IA sem inventar dados.
5. Fase 5: publicacao assistida, jobs e pedidos reais.
6. Fase 6: Central de Erros e patches assistidos.
7. Fase 7: planos, admin, compliance, responsividade e deploy final.

## Atualizacao da conclusao da Fase 1

- Prisma/PostgreSQL foi expandido com `UserSession`, `PasswordResetToken` e `EmailVerificationToken`.
- Repositories reais foram adicionados para usuarios, workspaces, membros, sessoes, tokens e auditoria.
- Autenticacao passou a usar access token curto e refresh token rotativo com hash persistido.
- Rotas de perfil, sessoes, recuperacao de senha, verificacao de email e workspaces foram adicionadas.
- Frontend recebeu login, cadastro, reset, verificacao, onboarding, selecao de workspace, equipe e sessoes.
- Readiness agora valida conexao PostgreSQL, variaveis criticas e estado basico das migrations.
- A execucao local sem `DATABASE_URL` real continua retornando readiness 503 por seguranca.

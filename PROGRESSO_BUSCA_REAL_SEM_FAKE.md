# Progresso - Busca real sem produto fake

Data: 2026-07-12

## Problema

- A busca por termos como `carro` mostrava produtos demonstrativos como se fossem reais.
- Mercado Livre retornava `403` na busca publica sem token.
- AliExpress abria OAuth sem parametros obrigatorios e mostrava `Parametro ausente`.
- Cards sem foto real atrapalhavam o uso operacional.

## Correcoes feitas

- `POST /products/public-search` nao gera mais produtos fallback quando todas as fontes oficiais falham.
- Se Mercado Livre/AliExpress nao retornarem produtos reais com foto, a resposta vem com `products: []` e mensagem explicando o motivo.
- Mercado Livre agora usa token OAuth do workspace quando houver integracao conectada.
- AliExpress OAuth agora monta URL com `client_id`, `redirect_uri`, `response_type=code` e `state`.
- A tela de setup do AliExpress agora mostra/copia `ALIEXPRESS_REDIRECT_URI`.
- O teste Mercado Livre passa a explicar `403` como bloqueio de busca publica quando nao houver token.
- Frontend mostra mensagem de "Nenhum produto real retornado" em vez de cards demonstrativos.

## Arquivos alterados

- `server/controllers/products.controller.js`
- `server/marketplaces/mercadoLivre.client.js`
- `server/marketplaces/aliexpress.client.js`
- `server/controllers/integrations.controller.js`
- `server/repositories/integration.repository.js`
- `server/services/systemCredentials.service.js`
- `server/controllers/systemCredentials.controller.js`
- `public/assets/js/app.js`
- `public/assets/js/setupApis.js`
- `PROGRESSO_BUSCA_REAL_SEM_FAKE.md`

## Smoke test

Requisicao:

```text
POST /Droppingship/api/products/public-search
query=carro
sources=mercadoLivre,aliexpress
```

Resultado local sem OAuth/token real:

```json
{
  "products": 0,
  "fallbackUsed": true,
  "message": "Nenhuma fonte retornou produtos reais com foto para essa busca. Conecte OAuth ou revise credenciais/permissoes oficiais.",
  "sources": "mercadoLivre:blocked_public_search; aliexpress:auth_required"
}
```

## Testes executados

- `node --check server/controllers/products.controller.js`
- `node --check server/marketplaces/mercadoLivre.client.js`
- `node --check server/marketplaces/aliexpress.client.js`
- `node --check server/controllers/integrations.controller.js`
- `node --check server/services/systemCredentials.service.js`
- `node --check server/controllers/systemCredentials.controller.js`
- `node --check public/assets/js/app.js`
- `node --check public/assets/js/setupApis.js`
- `npm run lint`
- `npm run build`
- `npm test`

Resultado: todos passaram; `npm test` passou com 16 testes.

## O que falta para ficar real operacional

- Conectar Mercado Livre por OAuth com banco PostgreSQL ativo para salvar token por workspace.
- Cadastrar no AliExpress Open Platform a mesma `ALIEXPRESS_REDIRECT_URI` configurada no app.
- Ter app/escopo AliExpress aprovado para busca de produtos/affiliate.
- Validar que as APIs oficiais retornam produtos com imagem antes de permitir salvar/publicar.

## Confirmacoes

- Nao houve push.
- Nao houve merge.
- Nao houve deploy.
- Nao houve `prisma migrate reset`.
- Nenhum dado foi apagado.

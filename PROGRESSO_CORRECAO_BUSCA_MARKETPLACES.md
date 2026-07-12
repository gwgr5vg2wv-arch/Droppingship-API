# Progresso - Correcao busca marketplaces

Data: 2026-07-12

## Problema visto

- Ao buscar produtos, a tela mostrava Shopee, Temu e TikTokShop mesmo o uso atual sendo Mercado Livre e AliExpress.
- O botao "Buscar online publico" chamava `/products/search`, que usa provedores agregados globais e nao respeitava os marketplaces selecionados.
- Quando uma fonte falhava, o backend criava produtos fallback duplicados por marketplace.
- Mercado Livre retornou `403` na busca publica deste ambiente.

## Correcoes feitas

- O botao de busca publica agora chama `/products/public-search`.
- A busca publica agora usa os marketplaces marcados nas configuracoes, limitada por enquanto a `mercadoLivre` e `aliexpress`.
- Se nada estiver marcado, o padrao temporario e `mercadoLivre` + `aliexpress`.
- Shopee, Temu e TikTokShop foram removidos do seletor de busca enquanto aguardam aprovacao.
- O backend agora cria apenas um conjunto de produtos fallback quando todas as fontes solicitadas falham.
- Os cards de status agora mostram mensagens mais claras por fonte.

## Arquivos alterados

- `public/assets/js/app.js`
- `public/assets/js/api.js`
- `public/bot.html`
- `server/controllers/products.controller.js`

## Testes executados

- `node --check public/assets/js/app.js`
- `node --check public/assets/js/api.js`
- `node --check server/controllers/products.controller.js`
- `npm run lint`
- `npm run build`
- `npm test`

Resultado: todos passaram; `npm test` passou com 16 testes.

## Observacoes

- O erro `403` do Mercado Livre nao e bug visual: e bloqueio da busca publica pelo provedor neste ambiente. O app agora trata isso como fonte indisponivel e usa fallback unico.
- AliExpress ainda depende de credenciais/aprovacao oficial para busca real consistente.
- Nao houve push, merge ou deploy.

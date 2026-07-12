# Droppingship

Aplicacao SaaS/ERP de dropshipping configurada para trabalhar somente com dados reais vindos de integracoes permitidas.

## Modo de dados

O sistema nao cria produtos, precos, imagens, vendas, avaliacoes, tendencias ou publicacoes artificiais. Quando nenhuma fonte real retorna resultado, a API responde com lista vazia e mensagem amigavel.

## Fontes reais

- Mercado Livre: busca publica permitida em `https://api.mercadolibre.com/sites/MLB/search` e OAuth oficial para acoes privadas.
- Google Custom Search: usado somente quando `GOOGLE_SEARCH_API_KEY` e `GOOGLE_SEARCH_CX` estiverem configurados.
- SerpAPI: usado somente quando `SERPAPI_API_KEY` estiver configurado.
- RapidAPI: usado somente quando `RAPIDAPI_KEY` e `RAPIDAPI_HOST` estiverem configurados.

Shopee, Temu, TikTok Shop, AliExpress e Amazon nao estao integrados sem API oficial, feed autorizado ou credenciais reais.

## Variaveis

Veja `.env.example`. Nao envie `.env` ao GitHub.

## Rodar localmente

```powershell
npm install
npm run check
npm test
npm run dev
```

Abra `http://localhost:3000/Droppingship/bot.html`.

## Publicacao

Publicacao real exige OAuth oficial, conta conectada e validacao de titulo, categoria, preco, estoque, condicao, imagens e descricao. O sistema nao marca item como publicado sem confirmacao da API oficial.

## Deploy

Veja `DEPLOY.md` para configurar GitHub e Render.

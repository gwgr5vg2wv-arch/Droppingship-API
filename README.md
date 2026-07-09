# Droppingship Bot SaaS/ERP

Primeira base profissional em modo mock para pesquisar produtos, calcular margem, gerar anuncio com IA simulada, salvar oportunidades, preparar fila de publicacao, acompanhar pedidos simulados, financeiro e configuracoes.

## Instalar

```bash
npm install
```

## Criar `.env`

No Windows:

```bash
copy .env.example .env
```

Configure:

```env
PORT=3000
OPENAI_API_KEY=
INTEGRATION_MODE=mock
TRENDS_MODE=mock
```

Sem `OPENAI_API_KEY`, o sistema continua funcionando com textos profissionais em modo mock.

## Modos de integracao

```env
INTEGRATION_MODE=mock
TRENDS_MODE=mock
```

- `mock`: tudo funciona simulado, sem chamar APIs reais.
- `hybrid`: tenta usar API oficial quando houver credenciais e token; se falhar, volta para mock com aviso.
- `real`: exige conta conectada; se faltar token, retorna erro amigavel.

Credenciais ficam somente no backend via `.env` ou `server/data/db.json`. O frontend nunca mostra secrets.

## Busca publica antes do OAuth

O usuario pode pesquisar produtos online antes de conectar qualquer conta:

```text
POST /Droppingship/api/products/public-search
```

Body:

```json
{
  "query": "fone bluetooth",
  "sources": ["mercadoLivre", "shopee", "temu", "tiktokShop", "aliexpress"]
}
```

- Mercado Livre usa busca publica real quando possivel:
  `https://api.mercadolibre.com/sites/MLB/search?q=QUERY&limit=20`
- Shopee, Temu, TikTok Shop e AliExpress ficam preparados para busca publica/affiliate; quando bloquearem ou dependerem de aprovacao, retornam fallback mock com motivo.
- Os resultados sao unidos em ranking unico por demanda, preco, margem estimada, frete, vendidos, risco e score final.
- OAuth fica reservado para acoes privadas: publicar anuncio, sincronizar pedidos, atualizar estoque, ler conta, gerar etiquetas/envios e acessar loja conectada.

## APIs oficiais preparadas

Variaveis disponiveis no `.env.example`:

```env
MERCADO_LIVRE_CLIENT_ID=
MERCADO_LIVRE_CLIENT_SECRET=
MERCADO_LIVRE_REDIRECT_URI=http://localhost:3000/Droppingship/api/integrations/oauth/mercadoLivre/callback

SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_SHOP_ID=
SHOPEE_REDIRECT_URI=http://localhost:3000/Droppingship/api/integrations/oauth/shopee/callback

TIKTOK_SHOP_APP_KEY=
TIKTOK_SHOP_APP_SECRET=
TIKTOK_SHOP_REDIRECT_URI=http://localhost:3000/Droppingship/api/integrations/oauth/tiktokShop/callback

ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=

TEMU_APP_KEY=
TEMU_APP_SECRET=
```

Mercado Livre, Shopee, TikTok Shop, AliExpress e Temu dependem de conta aprovada, escopos oficiais e ajustes finais conforme o app criado em cada plataforma. Nao ha scraping nem automacao fora das APIs oficiais.

## Rodar API

```bash
npm run dev
```

API:

```text
http://localhost:3000/Droppingship/api
```

Teste:

```text
http://localhost:3000/Droppingship/api/health
```

Compatibilidade:

```text
http://localhost:3000/Droppingship/health
```

## Produção com PM2

Instale dependências e suba a API Node:

```bash
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

Backend de produção:

```text
https://sstbet.site.je/drop/Droppingship/api
```

Frontend de produção:

```text
https://sstbet.site.je/drop/Droppingship/public/bot.html
```

Teste as rotas:

```text
https://sstbet.site.je/drop/Droppingship/api/health
https://sstbet.site.je/drop/Droppingship/api/integrations/status
```

As mesmas rotas continuam disponiveis localmente em:

```text
http://localhost:3000/Droppingship/api
```

## Abrir frontend pelo XAMPP

Copie ou sirva a pasta `public` dentro do caminho do XAMPP como `Droppingship`.

Abra:

```text
http://localhost:8080/Droppingship/bot.html
```

O frontend chama sempre:

```text
http://localhost:3000/Droppingship/api
```

## O que ja funciona

- Dashboard com produtos encontrados, salvos, fila, pedidos, lucro e ROI.
- Header profissional com avatar, plano e status online.
- Hero visual com apresentacao curta da aplicacao.
- Pesquisa mock por produto, com variacao por termos como `fone`, `garrafa`, `relogio`, `pet` e `casa`.
- Calculo de lucro, taxa, custo e ROI.
- IA mock para titulo, descricao, tags e bullets.
- Produtos salvos.
- Fila de anuncios com simulacao de publicacao.
- Pedidos simulados.
- Financeiro resumido.
- Configuracoes mock de perfil, marketplace e regras de margem.
- Aba Tendencias com oportunidades mock profissionais.
- Aba Integracoes com status e botoes de conexao OAuth.
- Busca real/hibrida preparada por marketplace.
- Publicacao preparada em `POST /Droppingship/api/products/publish`.
- SVGs locais leves em `public/assets/img`, sem imagens externas.
- Estrutura separada para Mercado Livre, Shopee, AliExpress, Temu e TikTok Shop.

## Rotas novas

```text
GET  /Droppingship/api/integrations/status
GET  /Droppingship/api/integrations/oauth/:marketplace/start
GET  /Droppingship/api/integrations/oauth/:marketplace/callback
GET  /Droppingship/api/trends
POST /Droppingship/api/products/public-search
POST /Droppingship/api/products/search-real
POST /Droppingship/api/products/publish
GET  /Droppingship/api/orders/sync
```

Na pagina, use a aba `Integracoes` ou o resumo em `Configuracoes` para conectar cada marketplace. Se faltar credencial no `.env`, o painel mostra uma mensagem amigavel e continua em mock.

Na busca, o botao `Buscar online publico` consulta fontes publicas sem OAuth. Cards mostram:

- fonte real publica ou fallback;
- motivo do fallback;
- marketplace de origem;
- score;
- botao `Preparar anuncio`;
- botao `Publicar` bloqueado com aviso `Conecte sua conta para publicar` quando OAuth nao estiver conectado.

## Proximo passo de negocio

A rotina inicial para sua irma trabalhar de casa pode ser:

1. Pesquisar 10 ideias por dia.
2. Salvar apenas produtos com ROI bom e risco baixo ou medio.
3. Copiar o anuncio gerado.
4. Montar testes manuais em marketplaces.
5. Registrar pedidos e margens.
6. Depois conectar APIs oficiais, multiusuario, assinatura e permissoes de equipe.

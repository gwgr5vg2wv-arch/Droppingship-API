# Render - variaveis obrigatorias

Use o Render como ambiente principal. O frontend aponta sempre para:

```text
https://sstbet.onrender.com/Droppingship/api
```

## Obrigatorias

Configure no painel do Render:

```env
NODE_ENV=production
APP_URL=https://sstbet.onrender.com
FRONTEND_URL=https://sstbet.onrender.com
DATABASE_URL=<PostgreSQL externo do Render ou Neon/Supabase>
JWT_SECRET=<gerar valor longo>
JWT_REFRESH_SECRET=<gerar valor longo>
SESSION_SECRET=<gerar valor longo>
ENCRYPTION_KEY=<gerar valor longo com 32+ caracteres>
MERCADO_LIVRE_CLIENT_ID=5338636718495082
MERCADO_LIVRE_CLIENT_SECRET=<secret do app Mercado Livre>
MERCADO_LIVRE_REDIRECT_URI=https://sstbet.onrender.com/Droppingship/api/integrations/oauth/mercadoLivre/callback
MARKETPLACE_WRITE_ENABLED=false
AI_PATCH_ENABLED=false
AUTO_APPLY_PATCHES=false
INTEGRATION_MODE=mock
TRENDS_MODE=mock
```

## Busca real obrigatoria

Para evitar resultados demonstrativos, configure pelo menos uma fonte externa real:

```env
SERPAPI_API_KEY=<chave SerpApi>
```

ou:

```env
GOOGLE_SEARCH_API_KEY=<chave Google Custom Search>
GOOGLE_SEARCH_CX=<id do mecanismo de busca>
```

Essas fontes sao usadas quando Mercado Livre ou AliExpress bloqueiam a busca oficial/publica. O OAuth continua sendo usado para conta, tokens e publicacao futura.

## Depois de configurar

1. Clique em **Manual Deploy / Deploy latest commit** no Render.
2. Abra:

```text
https://sstbet.onrender.com/Droppingship/api/health/ready
```

3. O esperado e:

```json
{"status":"ok"}
```

4. Use o app em:

```text
https://sstbet.onrender.com/Droppingship/bot.html
```

## Observacoes

- Nao inicie OAuth pelo `localhost`.
- O callback cadastrado no Mercado Livre deve ser exatamente:

```text
https://sstbet.onrender.com/Droppingship/api/integrations/oauth/mercadoLivre/callback
```

- Se `DATABASE_URL` estiver ausente, login e OAuth nao funcionam no Render.

# Integracao Mercado Livre

## Status

Implementada parcialmente: busca publica permitida, inicio de OAuth, callback e cliente de API. A escrita real fica bloqueada por `MARKETPLACE_WRITE_ENABLED=false`.

## Credenciais

```text
MERCADO_LIVRE_CLIENT_ID=
MERCADO_LIVRE_CLIENT_SECRET=
MERCADO_LIVRE_REDIRECT_URI=
```

Nao coloque segredos no GitHub.

## Criar aplicacao

1. Acesse o DevCenter oficial do Mercado Livre.
2. Crie uma aplicacao.
3. Configure a URL de callback:

```text
https://SEU_DOMINIO/Droppingship/api/integrations/oauth/mercadoLivre/callback
```

## Fluxo de autorizacao

1. Frontend chama `/Droppingship/api/integrations/oauth/mercadoLivre/start`.
2. Backend gera URL oficial de autorizacao.
3. Usuario autoriza no Mercado Livre.
4. Mercado Livre retorna `code` para o callback.
5. Backend troca `code` por token.

## Limitacoes atuais

- O state OAuth ainda precisa ser persistido e validado.
- Tokens devem migrar para armazenamento criptografado no PostgreSQL.
- Categorias, atributos obrigatorios, frete, garantia e politicas comerciais ainda precisam de validacao completa.
- Publicacao real esta bloqueada por padrao.

## Testes seguros

- Testar status e conta com token de desenvolvimento.
- Testar validacao de anuncio sem publicar.
- Manter `MARKETPLACE_WRITE_ENABLED=false` ate aprovacao.

## Erros comuns

- Credencial obrigatoria ausente.
- Redirect URI diferente do cadastrado no app.
- Conta sem permissao para publicar.
- Token expirado.
- Limite temporario da API.

## Desconectar e revogar

O produto deve apagar tokens criptografados localmente e orientar o usuario a revogar acesso no painel oficial do Mercado Livre.

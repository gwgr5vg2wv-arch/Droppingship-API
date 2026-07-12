# Integracao AliExpress

## Status

Preparada parcialmente. A integracao depende de app aprovado, credenciais reais e permissoes da AliExpress Open Platform/Affiliate API.

## Credenciais

```text
ALIEXPRESS_APP_KEY=
ALIEXPRESS_APP_SECRET=
ALIEXPRESS_REDIRECT_URI=
```

Nao inclua segredos reais em arquivos versionados.

## Criar aplicacao

1. Acesse a AliExpress Open Platform.
2. Solicite ou configure acesso ao programa/API autorizada.
3. Configure a callback:

```text
https://SEU_DOMINIO/Droppingship/api/integrations/oauth/aliexpress/callback
```

## Fluxo esperado

1. Validar credenciais.
2. Confirmar permissoes de produto, detalhe, preco, estoque e imagens.
3. Buscar apenas via API/feed autorizado.
4. Registrar falhas de permissao explicitamente.

## Limitacoes atuais

- Sem scraping.
- Sem endpoint privado.
- Sem cookie manual.
- Sem contorno de bloqueios.
- Publicacao direta depende de permissao oficial e nao deve ser anunciada como pronta.

## Testes seguros

- Testar chamadas de leitura em ambiente autorizado.
- Registrar 401/403/429 sem retry agressivo.
- Mostrar ao usuario: `Integracao nao configurada`, `Credencial obrigatoria ausente` ou `Esta conta ainda nao possui autorizacao para esta funcionalidade`.

## Revogacao

Remover tokens criptografados do banco e orientar revogacao no painel oficial da plataforma.

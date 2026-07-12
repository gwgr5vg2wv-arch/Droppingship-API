import { provider as mercadoLivre } from './providers/mercadolivre.provider.js';
import { provider as googleCustomSearch } from './providers/googleCustomSearch.provider.js';
import { provider as serpApi } from './providers/serpApi.provider.js';
import { provider as rapidApi } from './providers/rapidApi.provider.js';

export const providers = [
  mercadoLivre,
  googleCustomSearch,
  serpApi,
  rapidApi
];

export function enabledRealProviders() {
  return providers.filter((provider) => provider.enabled);
}

export async function providerStatus() {
  return Promise.all(providers.map(async (provider) => {
    const health = await provider.healthCheck().catch((error) => ({ ok: false, message: error.message || 'Fonte indisponivel' }));
    return {
      name: provider.name,
      enabled: Boolean(provider.enabled),
      ok: Boolean(health.ok),
      disabled: Boolean(health.disabled || !provider.enabled),
      configured: Boolean(health.configured ?? provider.enabled),
      message: health.message || (provider.enabled ? 'Fonte disponivel' : 'Credenciais nao configuradas')
    };
  }));
}

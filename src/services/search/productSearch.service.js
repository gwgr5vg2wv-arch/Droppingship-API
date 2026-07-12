import { getCache, makeCacheKey, setCache } from './cache.service.js';
import { dedupeProducts, normalizeProduct } from './normalizeProduct.js';
import { enabledRealProviders, mockProvider, providerStatus } from './sourceRegistry.js';

const defaultTimeout = Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000);

export async function searchProducts(query, options = {}) {
  const validated = validateSearchInput(query, options);
  const key = makeCacheKey({ q: validated.query, page: validated.page, limit: validated.limit, category: options.category || 'all' });
  const started = Date.now();

  if (!options.refresh) {
    const cached = getCache(key);
    if (cached) return { ...cached, meta: { ...cached.meta, cacheHit: true } };
  }

  const realProviders = enabledRealProviders();
  const disabled = (await providerStatus()).filter((item) => item.disabled && item.name !== 'mock');
  const settled = await Promise.allSettled(realProviders.map((provider) => runProvider(provider, 'searchProducts', validated.query, validated)));
  const providerMeta = [];
  const realProducts = [];

  disabled.forEach((item) => {
    console.log(`[SEARCH] provider="${item.name}" status="disabled"`);
    providerMeta.push({ name: item.name, ok: false, disabled: true, message: item.message });
  });

  settled.forEach((result, index) => {
    const provider = realProviders[index];
    if (result.status === 'fulfilled') {
      providerMeta.push({ name: provider.name, ok: true, count: result.value.length });
      realProducts.push(...result.value.map((item) => normalizeProduct(item, provider.name)));
    } else {
      providerMeta.push({ name: provider.name, ok: false, message: friendlyProviderMessage(result.reason) });
    }
  });

  let products = dedupeProducts(realProducts);
  let fallbackProducts = [];
  if (!products.length) {
    const fallbackRaw = await mockProvider().searchProducts(validated.query, validated);
    fallbackProducts = fallbackRaw.map((item) => normalizeProduct(item, 'mock'));
    products = fallbackProducts;
  }

  products = products
    .sort((a, b) => Number(a.isFallback) - Number(b.isFallback) || b.opportunityScore - a.opportunityScore)
    .slice((validated.page - 1) * validated.limit, validated.page * validated.limit);

  const response = {
    query: validated.query,
    products,
    meta: {
      total: products.length,
      realResults: products.filter((item) => !item.isFallback).length,
      fallbackResults: products.filter((item) => item.isFallback).length,
      durationMs: Date.now() - started,
      cacheHit: false,
      providers: providerMeta
    }
  };

  console.log(`[SEARCH] completed real=${response.meta.realResults} fallback=${response.meta.fallbackResults} duration=${response.meta.durationMs}ms`);
  setCache(key, response);
  return response;
}

export async function searchTrends(options = {}) {
  const query = options.q || options.query || 'produtos em alta';
  const result = await searchProducts(query, { ...options, limit: options.limit || 20 });
  const sourceCounts = result.meta.providers.filter((item) => item.ok).sort((a, b) => (b.count || 0) - (a.count || 0));
  return {
    ...result,
    summary: {
      analyzed: result.products.length,
      strongOpportunities: result.products.filter((item) => item.opportunityScore >= 70).length,
      averageRoi: average(result.products.map((item) => item.roi)),
      topSource: sourceCounts[0]?.name || 'mock'
    }
  };
}

export async function getProductById(id) {
  const response = await searchProducts('produto', { limit: 50 });
  return response.products.find((product) => product.id === id || product.externalId === id) || null;
}

export { providerStatus };

export function validateSearchInput(query, options = {}) {
  const normalized = String(query || options.q || '').trim().slice(0, 120);
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.min(50, Math.max(1, Number(options.limit || 20)));
  if (normalized.length < 2) {
    const error = new Error('Informe uma busca com pelo menos 2 caracteres.');
    error.status = 400;
    throw error;
  }
  return { query: normalized, page, limit, timeoutMs: Number(options.timeoutMs || defaultTimeout), category: options.category || 'all' };
}

export function withTimeout(promise, timeoutMs = defaultTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('timeout');
      error.reason = 'timeout';
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function runProvider(provider, method, query, options) {
  return withTimeout(provider[method](query, options), options.timeoutMs);
}

function friendlyProviderMessage(error) {
  if (error?.reason === 'timeout' || error?.message === 'timeout') return 'Fonte demorou para responder';
  if (error?.reason === 'rate_limit') return 'Limite temporario da fonte';
  if (error?.reason === 'blocked_public_search') return 'Fonte publica indisponivel';
  return 'Fonte indisponivel no momento';
}

function average(values = []) {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length) * 100) / 100;
}

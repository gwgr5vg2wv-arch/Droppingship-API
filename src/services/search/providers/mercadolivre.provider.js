import axios from 'axios';

const apiBase = 'https://api.mercadolibre.com';

export const provider = {
  name: 'mercadoLivre',
  enabled: true,

  async searchProducts(query, options = {}) {
    const started = Date.now();
    try {
      const { data } = await axios.get(`${apiBase}/sites/MLB/search`, {
        params: { q: query, limit: options.limit || 20, offset: ((options.page || 1) - 1) * (options.limit || 20) },
        headers: { Accept: 'application/json' },
        timeout: options.timeoutMs || Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000),
        validateStatus: (status) => status < 400
      });

      const products = (data.results || []).map((item) => ({
        id: `ML-${item.id}`,
        externalId: item.id,
        title: item.title,
        description: item.title,
        source: 'mercadoLivre',
        marketplace: 'mercadoLivre',
        url: item.permalink,
        image: item.secure_thumbnail || item.thumbnail,
        images: [item.secure_thumbnail || item.thumbnail],
        supplierPrice: Number(item.price || 0),
        shippingPrice: item.shipping?.free_shipping ? 0 : 0,
        suggestedPrice: Number(item.price || 0),
        soldCount: Number(item.sold_quantity || 0),
        condition: item.condition || '',
        seller: item.seller?.nickname || '',
        location: item.address?.state_name || item.seller_address?.state?.name || '',
        currency: item.currency_id || 'BRL',
        tags: ['mercado-livre', item.condition].filter(Boolean),
        isFallback: false
      }));

      console.log(`[SEARCH] query="${safe(query)}" provider="mercadoLivre" results=${products.length} duration=${Date.now() - started}ms`);
      return products;
    } catch (error) {
      const status = error?.response?.status;
      const message = status === 403 ? 'blocked_public_search' : status === 429 ? 'rate_limit' : error.code === 'ECONNABORTED' ? 'timeout' : 'unavailable';
      console.warn(`[SEARCH] provider="mercadoLivre" error="${message}"`);
      const mapped = new Error(message);
      mapped.status = status;
      mapped.reason = message;
      throw mapped;
    }
  },

  async searchTrends(query, options = {}) {
    return this.searchProducts(query || 'produto tendencia', options);
  },

  async healthCheck() {
    return { ok: true, message: 'Fonte disponivel' };
  }
};

function safe(value) {
  return String(value || '').replace(/"/g, '');
}

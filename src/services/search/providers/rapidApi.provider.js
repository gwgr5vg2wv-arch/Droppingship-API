import axios from 'axios';

export const provider = {
  name: 'rapidApi',
  get enabled() {
    return Boolean(process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_HOST);
  },

  async searchProducts(query, options = {}) {
    if (!this.enabled) return [];
    const { data } = await axios.get(`https://${process.env.RAPIDAPI_HOST}/search`, {
      params: { q: query, limit: options.limit || 20 },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
      },
      timeout: options.timeoutMs || Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000)
    });

    const items = data.products || data.results || data.items || [];
    return items.map((item) => ({
      id: `RAPID-${item.id || item.product_id || item.url}`,
      externalId: item.id || item.product_id || null,
      title: item.title || item.name,
      description: item.description || item.title || item.name,
      source: 'rapidApi',
      marketplace: item.marketplace || 'rapidApi',
      url: item.url || item.link,
      image: item.image || item.thumbnail,
      images: [item.image || item.thumbnail].filter(Boolean),
      supplierPrice: Number(item.price || item.sale_price || 0),
      suggestedPrice: Number(item.price || item.sale_price || 0),
      rating: item.rating || null,
      soldCount: item.sold || item.soldCount || null,
      tags: ['rapidapi'],
      isFallback: false
    }));
  },

  async searchTrends(query, options = {}) {
    return this.searchProducts(query || 'produtos tendencia', options);
  },

  async healthCheck() {
    return this.enabled
      ? { ok: true, message: 'Fonte disponivel' }
      : { ok: false, disabled: true, message: 'API key nao configurada' };
  }
};

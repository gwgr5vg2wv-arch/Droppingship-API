import axios from 'axios';

export const provider = {
  name: 'serpApi',
  get enabled() {
    return Boolean(process.env.SERPAPI_API_KEY);
  },

  async searchProducts(query, options = {}) {
    if (!this.enabled) return [];
    const { data } = await axios.get('https://serpapi.com/search.json', {
      params: {
        engine: 'google_shopping',
        q: query,
        api_key: process.env.SERPAPI_API_KEY
      },
      timeout: options.timeoutMs || Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000)
    });

    return (data.shopping_results || []).slice(0, options.limit || 20).map((item) => ({
      id: `SERP-${item.product_id || item.link}`,
      externalId: item.product_id || null,
      title: item.title,
      description: item.source || item.title,
      source: 'serpApi',
      marketplace: item.source || 'serpApi',
      url: item.link,
      image: item.thumbnail,
      images: [item.thumbnail].filter(Boolean),
      supplierPrice: parsePrice(item.extracted_price || item.price),
      suggestedPrice: parsePrice(item.extracted_price || item.price),
      rating: item.rating || null,
      reviewCount: item.reviews || null,
      tags: ['serpapi'],
      isFallback: false
    }));
  },

  async searchTrends(query, options = {}) {
    return this.searchProducts(query || 'produtos em alta', options);
  },

  async healthCheck() {
    return this.enabled
      ? { ok: true, message: 'Fonte disponivel' }
      : { ok: false, disabled: true, message: 'API key nao configurada' };
  }
};

function parsePrice(value) {
  if (typeof value === 'number') return value;
  return Number(String(value || '').replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
}

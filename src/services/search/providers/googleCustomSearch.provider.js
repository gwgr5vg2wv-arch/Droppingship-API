import axios from 'axios';

export const provider = {
  name: 'googleCustomSearch',
  get enabled() {
    return Boolean(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX);
  },

  async searchProducts(query, options = {}) {
    if (!this.enabled) return [];
    const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: process.env.GOOGLE_SEARCH_API_KEY,
        cx: process.env.GOOGLE_SEARCH_CX,
        q: query,
        searchType: options.imagesOnly ? 'image' : undefined,
        num: Math.min(10, options.limit || 10)
      },
      timeout: options.timeoutMs || Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000)
    });

    return (data.items || []).map((item) => ({
      id: `GCS-${item.cacheId || item.link}`,
      externalId: item.cacheId || null,
      title: item.title,
      description: item.snippet,
      source: 'googleCustomSearch',
      marketplace: 'googleCustomSearch',
      url: item.link,
      image: item.pagemap?.cse_image?.[0]?.src || item.image?.thumbnailLink || null,
      images: [item.pagemap?.cse_image?.[0]?.src || item.image?.thumbnailLink].filter(Boolean),
      tags: ['google-custom-search'],
      isFallback: false
    }));
  },

  async searchTrends(query, options = {}) {
    return this.searchProducts(`${query || 'produto'} tendencia`, options);
  },

  async healthCheck() {
    return this.enabled
      ? { ok: true, configured: true, enabled: true, message: 'Fonte disponivel' }
      : { ok: false, configured: false, enabled: false, disabled: true, message: 'Credenciais nao configuradas' };
  }
};

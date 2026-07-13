import axios from 'axios';

const marketplaceQueries = {
  mercadoLivre: {
    label: 'Mercado Livre',
    site: 'mercadolivre.com.br',
    source: 'mercadoLivreExternal'
  },
  aliexpress: {
    label: 'AliExpress',
    site: 'aliexpress.com',
    source: 'aliexpressExternal'
  }
};

export function hasExternalSearchProvider() {
  return Boolean(process.env.SERPAPI_API_KEY || (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX));
}

export async function searchMarketplaceExternally(query, marketplace, options = {}) {
  const config = marketplaceQueries[marketplace];
  if (!config) return [];

  const providers = [
    searchWithSerpApi,
    searchWithGoogleCustomSearch
  ];

  for (const provider of providers) {
    const products = await provider(query, config, options).catch(() => []);
    if (products.length) return products;
  }

  return [];
}

async function searchWithSerpApi(query, config, options = {}) {
  if (!process.env.SERPAPI_API_KEY) return [];
  const { data } = await axios.get('https://serpapi.com/search.json', {
    params: {
      engine: 'google',
      q: `${query} site:${config.site}`,
      tbm: 'shop',
      api_key: process.env.SERPAPI_API_KEY,
      num: Math.min(20, options.limit || 20),
      gl: 'br',
      hl: 'pt-br'
    },
    timeout: options.timeoutMs || Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000)
  });

  const items = data.shopping_results || data.organic_results || [];
  return items.map((item) => externalProduct(item, config, 'serpApi')).filter(hasRealProductFields);
}

async function searchWithGoogleCustomSearch(query, config, options = {}) {
  if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_CX) return [];
  const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: {
      key: process.env.GOOGLE_SEARCH_API_KEY,
      cx: process.env.GOOGLE_SEARCH_CX,
      q: `${query} site:${config.site}`,
      num: Math.min(10, options.limit || 10),
      gl: 'br',
      hl: 'pt-BR'
    },
    timeout: options.timeoutMs || Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000)
  });

  return (data.items || []).map((item) => externalProduct(item, config, 'googleCustomSearch')).filter(hasRealProductFields);
}

function externalProduct(item, config, provider) {
  const url = item.link || item.product_link || item.serpapi_product_api || '';
  const image = item.thumbnail || item.image || item.pagemap?.cse_image?.[0]?.src || item.rich_snippet?.top?.detected_extensions?.thumbnail || '';
  const price = parsePrice(item.extracted_price || item.price || item.snippet);
  const title = item.title || item.name || '';

  return {
    id: `${config.source}-${hash(`${provider}:${url || title}`)}`,
    title,
    name: title,
    description: item.snippet || item.source || title,
    source: config.source,
    marketplace: config.source,
    originalMarketplace: config.label,
    url,
    permalink: url,
    productUrl: url,
    image,
    thumbnail: image,
    images: [image].filter(Boolean),
    price,
    sale_price: price,
    current_price: price,
    rating: Number(item.rating || 0),
    sold_quantity: Number(item.reviews || item.extensions?.find?.((value) => /vendidos/i.test(value))?.replace(/\D/g, '') || 0),
    provider,
    externalSearch: true
  };
}

function hasRealProductFields(product) {
  return Boolean(product.title && product.url && product.image);
}

function parsePrice(value) {
  if (typeof value === 'number') return value;
  const match = String(value || '').match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{2}|\.\d{2})?/);
  if (!match) return 0;
  return Number(match[0].replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) || 0;
}

function hash(value) {
  let output = 0;
  for (let index = 0; index < value.length; index += 1) {
    output = ((output << 5) - output) + value.charCodeAt(index);
    output |= 0;
  }
  return Math.abs(output).toString(36);
}

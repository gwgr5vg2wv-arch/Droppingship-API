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
  const result = await searchMarketplaceExternallyDetailed(query, marketplace, options);
  return result.products;
}

export async function searchMarketplaceExternallyDetailed(query, marketplace, options = {}) {
  const config = marketplaceQueries[marketplace];
  if (!config) return { products: [], diagnostics: [{ provider: 'externalSearch', ok: false, message: 'Marketplace sem busca externa configurada.' }] };

  const providers = [
    searchWithSerpApi,
    searchWithGoogleCustomSearch
  ];
  const diagnostics = [];

  for (const provider of providers) {
    const products = await provider(query, config, options).catch((error) => {
      const message = externalErrorMessage(error);
      diagnostics.push({ provider: provider.name, ok: false, message });
      console.warn(`[EXTERNAL_SEARCH] provider=${provider.name} marketplace=${marketplace} error="${message}"`);
      return [];
    });
    if (products.diagnostic) diagnostics.push(products.diagnostic);
    const list = Array.isArray(products) ? products : products.items || [];
    if (list.length) return { products: list, diagnostics };
  }

  return { products: [], diagnostics };
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
  const products = items.map((item) => externalProduct(item, config, 'serpApi')).filter(hasRealProductFields);
  console.log(`[EXTERNAL_SEARCH] provider=serpApi site=${config.site} items=${items.length} products=${products.length}`);
  products.diagnostic = { provider: 'serpApi', ok: products.length > 0, items: items.length, products: products.length };
  return products;
}

async function searchWithGoogleCustomSearch(query, config, options = {}) {
  if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_CX) return [];
  const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: {
      key: process.env.GOOGLE_SEARCH_API_KEY,
      cx: process.env.GOOGLE_SEARCH_CX,
      q: query,
      siteSearch: config.site,
      siteSearchFilter: 'i',
      num: Math.min(10, options.limit || 10),
      gl: 'br',
      hl: 'pt-BR'
    },
    timeout: options.timeoutMs || Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000)
  });

  const items = data.items || [];
  const products = items.map((item) => externalProduct(item, config, 'googleCustomSearch')).filter(hasRealProductFields);
  console.log(`[EXTERNAL_SEARCH] provider=googleCustomSearch site=${config.site} items=${items.length} products=${products.length}`);
  if (products.length) {
    products.diagnostic = { provider: 'googleCustomSearch', ok: true, items: items.length, products: products.length };
    return products;
  }

  const imageResults = await searchWithGoogleImages(query, config, options);
  imageResults.diagnostic = {
    provider: 'googleCustomSearch',
    ok: imageResults.length > 0,
    items: items.length,
    products: products.length,
    imageProducts: imageResults.length
  };
  return imageResults;
}

async function searchWithGoogleImages(query, config, options = {}) {
  const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: {
      key: process.env.GOOGLE_SEARCH_API_KEY,
      cx: process.env.GOOGLE_SEARCH_CX,
      q: query,
      siteSearch: config.site,
      siteSearchFilter: 'i',
      searchType: 'image',
      num: Math.min(10, options.limit || 10),
      gl: 'br',
      hl: 'pt-BR'
    },
    timeout: options.timeoutMs || Number(process.env.SEARCH_PROVIDER_TIMEOUT_MS || 8000)
  });

  const items = data.items || [];
  const products = items.map((item) => externalProduct(item, config, 'googleImageSearch')).filter(hasRealProductFields);
  console.log(`[EXTERNAL_SEARCH] provider=googleImageSearch site=${config.site} items=${items.length} products=${products.length}`);
  products.diagnostic = { provider: 'googleImageSearch', ok: products.length > 0, items: items.length, products: products.length };
  return products;
}

function externalProduct(item, config, provider) {
  const metatag = item.pagemap?.metatags?.[0] || {};
  const url = item.image?.contextLink ||
    item.link ||
    item.product_link ||
    item.serpapi_product_api ||
    metatag['og:url'] ||
    '';
  const image = item.thumbnail ||
    item.image?.thumbnailLink ||
    item.image?.contextLink && item.link ||
    item.pagemap?.cse_thumbnail?.[0]?.src ||
    item.pagemap?.cse_image?.[0]?.src ||
    metatag['og:image'] ||
    metatag['twitter:image'] ||
    item.rich_snippet?.top?.detected_extensions?.thumbnail ||
    '';
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

function externalErrorMessage(error) {
  const status = error?.response?.status;
  const providerMessage = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message;
  if (status) return `${status} ${providerMessage || ''}`.trim();
  return providerMessage || 'unknown';
}

import { calculateProductScore } from './productScore.service.js';
import { generateMockListing } from './ai.service.js';
import { round } from './margin.service.js';

function safeHttps(url = '') {
  if (!url) return '/Droppingship/assets/img/empty-state.svg';
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
}

function estimateSupplierPrice(price = 0) {
  return round(price * 0.58);
}

function estimateShippingCost(item = {}) {
  if (item.shipping?.free_shipping) return 0;
  if (item.shipping?.mode === 'me2') return 0;
  return 15;
}

function estimateDeliveryDays(item = {}) {
  if (item.shipping?.free_shipping) return 8;
  return 13;
}

function estimateRating(item = {}) {
  const sold = Number(item.sold_quantity || 0);
  const base = item.accepts_mercadopago ? 4.2 : 4.0;
  return round(Math.min(5, base + Math.min(0.8, sold / 400)));
}

export async function normalizeMercadoLivreItem(item = {}, query = '') {
  const price = Number(item.price || 0);
  const supplierPrice = estimateSupplierPrice(price);
  const shippingCost = estimateShippingCost(item);
  const feePercent = 12;
  const fee = round(price * (feePercent / 100));
  const profit = round(price - supplierPrice - shippingCost - fee);
  const roi = supplierPrice > 0 ? round((profit / supplierPrice) * 100) : 0;
  const product = {
    id: String(item.id || item.item_id || item.product_id || `ML-${Date.now()}`),
    title: item.title || `Produto ${query}`,
    source: 'mercadoLivre',
    real: true,
    mode: 'real',
    image: safeHttps(item.thumbnail || item.thumbnail_id || item.secure_thumbnail),
    productUrl: item.permalink || `https://produto.mercadolivre.com.br/${item.id}`,
    suggestedPrice: price,
    supplierPrice,
    shippingCost,
    profit,
    roi,
    rating: estimateRating(item),
    sold: Number(item.sold_quantity || item.sold || 0),
    deliveryDays: estimateDeliveryDays(item),
    trendScore: 0,
    competitionScore: 0,
    profitScore: 0,
    deliveryScore: 0,
    riskScore: 0,
    finalScore: 0,
    competitionLevel: 'medio',
    riskLevel: 'medio',
    recommendation: '',
    generatedTitle: item.title || `Oferta ${query}`,
    generatedDescription: `Produto listado no Mercado Livre. Verifique estoque, frete e posicionamento antes de publicar.`,
    tags: ['real', 'mercadoLivre', query.toString().toLowerCase().replace(/\s+/g, '-')]
  };

  const score = calculateProductScore(product);
  const listing = await generateMockListing(product);

  return {
    ...product,
    ...score,
    generatedTitle: listing.title,
    generatedDescription: listing.description,
    tags: Array.from(new Set([...(listing.tags || []), ...product.tags]))
  };
}

export function normalizeMockProduct(product = {}) {
  const score = calculateProductScore(product);
  return {
    ...product,
    ...score,
    real: false,
    mode: product.mode || 'mock',
    source: product.source || 'mock'
  };
}

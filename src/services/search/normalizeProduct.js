import { resolveImages, isValidExternalUrl } from './imageValidation.service.js';
import { scoreProduct } from './productScoring.service.js';

export function normalizeProduct(raw = {}, source = raw.source || 'unknown') {
  const images = resolveImages(raw);
  const supplierPrice = nullableMoney(raw.supplierPrice ?? raw.price ?? raw.salePrice ?? raw.suggestedPrice);
  const shippingPrice = raw.shipping?.free_shipping === true
    ? 0
    : nullableMoney(raw.shippingPrice ?? raw.shippingCost ?? raw.shipping?.cost);
  const base = {
    id: String(raw.id || raw.externalId || `${source}-${clean(raw.title || raw.name || 'produto').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
    externalId: raw.externalId ? String(raw.externalId) : (raw.id ? String(raw.id) : null),
    title: clean(raw.title || raw.name || 'Produto sem titulo'),
    description: nullableClean(raw.description || raw.snippet || raw.generatedDescription),
    source,
    marketplace: raw.marketplace || source,
    url: isValidExternalUrl(raw.url || raw.link || raw.permalink || '') ? (raw.url || raw.link || raw.permalink) : null,
    image: images.image,
    images: images.images,
    supplierPrice,
    shippingPrice,
    totalCost: 0,
    suggestedPrice: nullableMoney(raw.suggestedPrice ?? raw.salePrice ?? raw.price),
    estimatedProfit: nullableMoney(raw.estimatedProfit ?? raw.profit),
    roi: nullableMoney(raw.roi),
    rating: nullableNumber(raw.rating ?? raw.rating_average),
    reviewCount: nullableNumber(raw.reviewCount ?? raw.reviews),
    soldCount: nullableNumber(raw.soldCount ?? raw.soldQuantity ?? raw.sold_quantity ?? raw.sold),
    deliveryDays: nullableNumber(raw.deliveryDays),
    stock: nullableNumber(raw.stock ?? raw.available_quantity),
    condition: raw.condition || null,
    seller: raw.seller || null,
    category: raw.category || raw.category_id || null,
    attributes: Array.isArray(raw.attributes) ? raw.attributes : [],
    sourceUpdatedAt: raw.sourceUpdatedAt || raw.updatedAt || null,
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
    trendScore: nullableMoney(raw.trendScore),
    opportunityScore: nullableMoney(raw.opportunityScore ?? raw.score),
    competitionLevel: nullableClean(raw.competitionLevel ?? raw.competition),
    riskLevel: nullableClean(raw.riskLevel ?? raw.risk),
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean).map(String) : [],
    isFallback: false,
    fallbackReason: null,
    createdAt: raw.createdAt || new Date().toISOString()
  };

  const scored = scoreProduct(base);
  return {
    ...base,
    ...scored,
    salePrice: scored.suggestedPrice,
    shippingCost: scored.totalCost ? base.shippingPrice : base.shippingPrice,
    profit: scored.estimatedProfit,
    sold: base.soldCount,
    soldQuantity: base.soldCount,
    competition: scored.competitionLevel,
    risk: scored.riskLevel,
    sourceLabel: sourceLabel(source),
    generatedTitle: base.title,
    generatedDescription: base.description,
    fallbackUsed: false
  };
}

export function dedupeProducts(products = []) {
  const seen = new Set();
  return products.filter((product) => {
    const key = product.url || product.externalId || product.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceLabel(source) {
  return {
    mercadoLivre: 'Mercado Livre',
    googleCustomSearch: 'Google Custom Search',
    serpApi: 'SerpAPI',
    rapidApi: 'RapidAPI'
  }[source] || source;
}

function nullableMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : null;
}

function nullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function nullableClean(value) {
  const cleaned = clean(value);
  return cleaned || null;
}

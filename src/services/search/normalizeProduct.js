import { resolveImages, isValidExternalUrl } from './imageValidation.service.js';
import { scoreProduct } from './productScoring.service.js';

export function normalizeProduct(raw = {}, source = raw.source || 'mock') {
  const images = resolveImages(raw);
  const supplierPrice = money(raw.supplierPrice ?? raw.price ?? raw.salePrice ?? raw.suggestedPrice ?? 0);
  const shippingPrice = money(raw.shippingPrice ?? raw.shippingCost ?? raw.shipping?.cost ?? (raw.shipping?.free_shipping ? 0 : 0));
  const base = {
    id: String(raw.id || `${source}-${raw.externalId || Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    externalId: raw.externalId ? String(raw.externalId) : (raw.id ? String(raw.id) : null),
    title: clean(raw.title || raw.name || 'Produto sem titulo'),
    description: clean(raw.description || raw.snippet || raw.generatedDescription || 'Tendencia estimada com base em vendas, avaliacoes, disponibilidade e concorrencia.'),
    source,
    marketplace: raw.marketplace || source,
    url: isValidExternalUrl(raw.url || raw.link || raw.permalink || '') ? (raw.url || raw.link || raw.permalink) : null,
    image: images.image,
    images: images.images,
    supplierPrice,
    shippingPrice,
    totalCost: 0,
    suggestedPrice: money(raw.suggestedPrice ?? raw.salePrice ?? raw.price ?? 0),
    estimatedProfit: money(raw.estimatedProfit ?? raw.profit ?? 0),
    roi: money(raw.roi ?? 0),
    rating: nullableNumber(raw.rating ?? raw.rating_average),
    reviewCount: nullableNumber(raw.reviewCount ?? raw.reviews),
    soldCount: nullableNumber(raw.soldCount ?? raw.soldQuantity ?? raw.sold_quantity ?? raw.sold),
    deliveryDays: nullableNumber(raw.deliveryDays),
    trendScore: money(raw.trendScore ?? 0),
    opportunityScore: money(raw.opportunityScore ?? raw.score ?? 0),
    competitionLevel: normalizeCompetition(raw.competitionLevel ?? raw.competition),
    riskLevel: normalizeRisk(raw.riskLevel ?? raw.risk),
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean).map(String) : [],
    isFallback: Boolean(raw.isFallback),
    fallbackReason: raw.fallbackReason || null,
    createdAt: raw.createdAt || new Date().toISOString()
  };

  const scored = scoreProduct(base);
  return {
    ...base,
    ...scored,
    salePrice: scored.suggestedPrice,
    shippingCost: scored.totalCost ? base.shippingPrice : base.shippingPrice,
    profit: scored.estimatedProfit,
    sold: base.soldCount || 0,
    soldQuantity: base.soldCount || 0,
    competition: scored.competitionLevel,
    risk: scored.riskLevel,
    sourceLabel: base.isFallback ? 'Dados estimados' : sourceLabel(source),
    generatedTitle: base.title,
    generatedDescription: base.description,
    fallbackUsed: base.isFallback
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

function normalizeCompetition(value) {
  const text = String(value || '').toLowerCase();
  if (['baixa', 'baixo', 'low'].includes(text)) return 'baixa';
  if (['alta', 'alto', 'high'].includes(text)) return 'alta';
  return 'media';
}

function normalizeRisk(value) {
  const text = String(value || '').toLowerCase();
  if (['baixo', 'baixa', 'low'].includes(text)) return 'baixo';
  if (['alto', 'alta', 'high'].includes(text)) return 'alto';
  return 'medio';
}

function sourceLabel(source) {
  return {
    mercadoLivre: 'Mercado Livre',
    googleCustomSearch: 'Google Custom Search',
    serpApi: 'SerpAPI',
    rapidApi: 'RapidAPI',
    mock: 'Demonstracao'
  }[source] || source;
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
}

function nullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

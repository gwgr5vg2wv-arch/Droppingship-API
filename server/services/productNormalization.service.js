import { marketplaceLabels } from './integrationMode.service.js';
import { makeId } from './mockData.service.js';

const BASE_PATH = '/Droppingship';
const PRODUCT_IMAGE_BASE = `${BASE_PATH}/assets/images/products`;
const PLACEHOLDER_IMAGE = `${PRODUCT_IMAGE_BASE}/generic.png`;

const CATEGORY_IMAGES = {
  electronics: `${PRODUCT_IMAGE_BASE}/electronics.png`,
  beauty: `${PRODUCT_IMAGE_BASE}/beauty.png`,
  home: `${PRODUCT_IMAGE_BASE}/home.png`,
  tools: `${PRODUCT_IMAGE_BASE}/tools.png`,
  fashion: `${PRODUCT_IMAGE_BASE}/fashion.png`,
  pet: `${PRODUCT_IMAGE_BASE}/pet.png`,
  sports: `${PRODUCT_IMAGE_BASE}/sports.png`,
  generic: PLACEHOLDER_IMAGE
};

const SOURCE_LABELS = {
  mock: 'Demonstracao',
  hybrid: 'Dados estimados',
  fallback: 'Dados estimados',
  public: 'Busca publica',
  real: 'Dados oficiais',
  external: 'Busca externa real'
};

export function normalizeProduct(product = {}, source = product.source || 'mock') {
  const mode = product.mode || (product.isFallback ? 'hybrid' : source);
  const isFallback = Boolean(product.isFallback || product.fallbackUsed || ['mock', 'hybrid', 'fallback'].includes(mode));
  const supplierPrice = safeNumber(product.supplierPrice || product.cost || product.price * 0.58);
  const shippingPrice = safeNumber(product.shippingPrice ?? product.shippingCost ?? product.freight ?? 0);
  const salePrice = safeNumber(product.salePrice ?? product.suggestedPrice ?? product.price ?? product.avgPrice ?? 0);
  const estimatedProfit = safeNumber(product.estimatedProfit ?? product.profit ?? (salePrice - supplierPrice - shippingPrice));
  const roi = safeNumber(product.roi ?? (supplierPrice + shippingPrice > 0 ? (estimatedProfit / (supplierPrice + shippingPrice)) * 100 : 0));
  const competition = normalizeLevel(product.competition ?? product.competitionLevel, 'media');
  const risk = normalizeLevel(product.risk ?? product.riskLevel, 'medio');
  const title = cleanText(product.title || product.generatedTitle || 'Produto sem titulo');
  const description = cleanText(product.description || product.generatedDescription || product.reason || 'Dados estimados para avaliacao de oportunidade.');
  const normalizedSource = source || product.source || 'mock';
  const image = resolveProductImage(product);
  const thumbnail = resolveProductImage({ image: product.thumbnail || product.secure_thumbnail || product.thumbnail_id || product.thumbnailId, category: product.category });
  const sourceLabel = isFallback
    ? SOURCE_LABELS[mode] || 'Dados estimados'
    : marketplaceLabels[normalizedSource] || SOURCE_LABELS[mode] || normalizedSource;

  return {
    ...product,
    id: String(product.id || product.item_id || product.product_id || makeId(isFallback ? 'MOCK' : 'PROD')),
    title,
    description,
    image,
    thumbnail,
    images: resolveProductImages(product, image),
    source: normalizedSource,
    sourceLabel,
    supplierPrice,
    shippingPrice,
    shippingCost: shippingPrice,
    salePrice,
    suggestedPrice: salePrice,
    estimatedProfit,
    profit: estimatedProfit,
    roi,
    score: safeNumber(product.score ?? product.finalScore ?? product.trendScore ?? 0),
    rating: safeNumber(product.rating ?? product.rating_average ?? 0),
    soldQuantity: safeNumber(product.soldQuantity ?? product.sold ?? product.sold_quantity ?? product.sales ?? 0),
    sold: safeNumber(product.sold ?? product.soldQuantity ?? product.sold_quantity ?? product.sales ?? 0),
    deliveryDays: safeNumber(product.deliveryDays ?? 0),
    trendScore: safeNumber(product.trendScore ?? product.demandScore ?? 0),
    competition,
    competitionLevel: competition,
    risk,
    riskLevel: risk,
    tags: Array.isArray(product.tags) ? product.tags.filter(Boolean) : [],
    productUrl: product.productUrl || product.permalink || product.url || product.link || '',
    isFallback,
    fallbackUsed: isFallback,
    mode: isFallback && mode === 'fallback' ? 'hybrid' : mode,
    generatedTitle: product.generatedTitle || title,
    generatedDescription: product.generatedDescription || description
  };
}

export function resolveProductImage(product = {}) {
  const candidate = product.image ||
    mercadoLivreImageFromId(product.thumbnail_id || product.thumbnailId) ||
    product.thumbnail ||
    product.secure_thumbnail ||
    product.picture ||
    product.pictures?.[0]?.secure_url ||
    product.pictures?.[0]?.url ||
    '';
  const categoryImage = CATEGORY_IMAGES[normalizeCategory(product.category || product.title || product.generatedTitle)] || PLACEHOLDER_IMAGE;
  return normalizeImagePath(candidate) || categoryImage;
}

export function resolveProductImages(product = {}, primary = resolveProductImage(product)) {
  const candidates = [
    primary,
    product.image,
    mercadoLivreImageFromId(product.thumbnail_id || product.thumbnailId),
    product.thumbnail,
    product.secure_thumbnail,
    product.picture,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.pictures) ? product.pictures.map((picture) => picture?.secure_url || picture?.url) : [])
  ].map(normalizeImagePath).filter(Boolean);

  return Array.from(new Set(candidates));
}

export function categoryImage(category = 'generic') {
  return CATEGORY_IMAGES[normalizeCategory(category)] || PLACEHOLDER_IMAGE;
}

export function fallbackReasonFor(error) {
  const status = error?.response?.status || error?.status;
  const code = error?.code || '';

  if (status === 401 || code === 'NOT_CONNECTED') return 'auth_required';
  if (status === 403) return 'blocked_public_search';
  if (status === 404) return 'auth_required';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'blocked_public_search';
  if (/403/.test(error?.message || '')) return 'blocked_public_search';
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') return 'rate_limit';
  return 'auth_required';
}

export function fallbackNoticeFor(reason) {
  if (!reason) return '';
  return 'Resultados demonstrativos - conecte sua conta para consultar dados ao vivo.';
}

function normalizeImagePath(value = '') {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return '';
  if (trimmed.startsWith('https://')) return upgradeMercadoLivreImage(trimmed);
  if (trimmed.startsWith('http://')) return upgradeMercadoLivreImage(trimmed.replace('http://', 'https://'));
  if (trimmed.startsWith(`${BASE_PATH}/`)) return trimmed;
  if (trimmed.startsWith('/assets/')) return `${BASE_PATH}${trimmed}`;
  if (trimmed.startsWith('assets/')) return `${BASE_PATH}/${trimmed}`;
  if (trimmed.startsWith('/')) return `${BASE_PATH}${trimmed}`;
  return `${BASE_PATH}/${trimmed}`;
}

function mercadoLivreImageFromId(thumbnailId = '') {
  const id = String(thumbnailId || '').trim();
  if (!id || /^(http|\/|assets)/i.test(id)) return '';
  return `https://http2.mlstatic.com/D_NQ_NP_2X_${id}-F.webp`;
}

function upgradeMercadoLivreImage(url = '') {
  if (!/mlstatic\.com/i.test(url)) return url;
  const highDensity = url.includes('/D_NQ_NP_2X_')
    ? url
    : url
      .replace('/D_Q_NP_2X_', '/D_NQ_NP_2X_')
      .replace('/D_Q_NP_', '/D_NQ_NP_2X_')
      .replace('/D_NQ_NP_', '/D_NQ_NP_2X_');
  return highDensity.replace(/-[A-Z]\.(jpg|jpeg|png|webp)$/i, '-F.webp');
}

function normalizeCategory(value = '') {
  const text = String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/electronics|fone|headset|camera|smart|relogio|carregador|eletr/.test(text)) return 'electronics';
  if (/beauty|beleza|escova|secador|maquiagem/.test(text)) return 'beauty';
  if (/home|casa|cozinha|luminaria|organizador/.test(text)) return 'home';
  if (/tools|ferramenta|tool|chave|furadeira/.test(text)) return 'tools';
  if (/fashion|moda|bolsa|roupa|calcado/.test(text)) return 'fashion';
  if (/pet|cachorro|gato/.test(text)) return 'pet';
  if (/esporte|fitness|sports|garrafa|squeeze/.test(text)) return 'sports';
  return 'generic';
}

function normalizeLevel(value, fallback) {
  const normalized = String(value || fallback).toLowerCase();
  return ['baixo', 'baixa'].includes(normalized) ? 'baixo' : ['alto', 'alta'].includes(normalized) ? 'alto' : 'medio';
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

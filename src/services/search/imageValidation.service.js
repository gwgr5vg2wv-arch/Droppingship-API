import fs from 'fs';
import path from 'path';

const BASE_PATH = '/Droppingship';
const PLACEHOLDER = `${BASE_PATH}/assets/images/product-placeholder.webp`;
const publicDir = path.resolve(process.cwd(), 'public');

export function normalizeImageUrl(url = '') {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  if (trimmed.startsWith('/')) {
    const relative = trimmed.startsWith(BASE_PATH) ? trimmed.slice(BASE_PATH.length) : trimmed;
    const localPath = path.resolve(publicDir, relative.replace(/^\/+/, ''));
    return fs.existsSync(localPath) ? `${BASE_PATH}${relative.startsWith('/') ? relative : `/${relative}`}` : null;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  parsed.protocol = 'https:';
  parsed.searchParams.delete('width');
  parsed.searchParams.delete('height');
  parsed.searchParams.delete('size');
  return parsed.toString();
}

export function mercadoLivreImageFromId(thumbnailId = '') {
  const id = String(thumbnailId || '').trim();
  if (!id || /^(http|\/|assets)/i.test(id)) return null;
  return `https://http2.mlstatic.com/D_NQ_NP_2X_${id}-F.webp`;
}

export function upgradeMercadoLivreImage(url = '') {
  const normalized = normalizeImageUrl(url);
  if (!normalized || !/mlstatic\.com/i.test(normalized)) return normalized;
  const highDensity = normalized.includes('/D_NQ_NP_2X_')
    ? normalized
    : normalized
      .replace('/D_Q_NP_2X_', '/D_NQ_NP_2X_')
      .replace('/D_Q_NP_', '/D_NQ_NP_2X_')
      .replace('/D_NQ_NP_', '/D_NQ_NP_2X_');
  return highDensity.replace(/-[A-Z]\.(jpg|jpeg|png|webp)$/i, '-F.webp');
}

export function pickValidImages(images = []) {
  const normalized = images
    .map(upgradeMercadoLivreImage)
    .filter(Boolean)
    .filter((url) => !/empty-state|product-card\.svg|avatar-default\.svg/i.test(url));
  return Array.from(new Set(normalized));
}

export function resolveImages(product = {}) {
  const images = pickValidImages([
    product.image,
    mercadoLivreImageFromId(product.thumbnail_id || product.thumbnailId),
    product.thumbnail,
    product.secure_thumbnail,
    product.picture,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.pictures) ? product.pictures.map((item) => item?.secure_url || item?.url) : [])
  ]);

  return {
    image: images[0] || PLACEHOLDER,
    images: images.length ? images : [PLACEHOLDER]
  };
}

export function isValidExternalUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export { PLACEHOLDER as productPlaceholder };

export function normalizeImageUrl(url = '') {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  if (trimmed.startsWith('/') || /^data:|^javascript:/i.test(trimmed)) return null;

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

export function pickValidImages(images = []) {
  const normalized = images
    .map(normalizeImageUrl)
    .filter(Boolean)
    .filter((url) => !/empty-state|product-card\.svg|avatar-default\.svg/i.test(url));
  return Array.from(new Set(normalized));
}

export function resolveImages(product = {}) {
  const images = pickValidImages([
    product.image,
    product.thumbnail,
    product.secure_thumbnail,
    product.picture,
    ...(Array.isArray(product.images) ? product.images : []),
    ...(Array.isArray(product.pictures) ? product.pictures.map((item) => item?.secure_url || item?.url) : [])
  ]);

  return {
    image: images[0] || null,
    images
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

export const productPlaceholder = null;

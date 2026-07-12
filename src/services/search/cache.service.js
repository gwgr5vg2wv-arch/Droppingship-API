const ttl = Number(process.env.SEARCH_CACHE_TTL_MS || 600000);
const maxEntries = 200;
const cache = new Map();

export function makeCacheKey(input = {}) {
  return JSON.stringify({
    q: String(input.q || input.query || '').toLowerCase().trim(),
    page: Number(input.page || 1),
    limit: Number(input.limit || 20),
    category: input.category || 'all'
  });
}

export function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > ttl) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

export function setCache(key, value) {
  cache.set(key, { value, createdAt: Date.now() });
  while (cache.size > maxEntries) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

export function clearCache() {
  cache.clear();
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, dedupeProducts } from '../src/services/search/normalizeProduct.js';
import { normalizeImageUrl } from '../src/services/search/imageValidation.service.js';
import { calculateRoi, calculateSuggestedPrice, calculateTotalCost } from '../src/services/search/productScoring.service.js';
import { provider as googleProvider } from '../src/services/search/providers/googleCustomSearch.provider.js';
import { searchProducts, validateSearchInput, withTimeout } from '../src/services/search/productSearch.service.js';

test('normalizeProduct returns stable fields', () => {
  const product = normalizeProduct({ id: '1', title: 'Mini camera', price: 100, image: 'http://example.com/a.jpg' }, 'mercadoLivre');
  assert.equal(product.id, '1');
  assert.equal(product.source, 'mercadoLivre');
  assert.equal(product.image.startsWith('https://'), true);
  assert.equal(typeof product.totalCost, 'number');
  assert.equal(product.isFallback, false);
});

test('ROI and suggested price are finite and above cost', () => {
  const totalCost = calculateTotalCost(50, 10);
  const suggestedPrice = calculateSuggestedPrice({ supplierPrice: 50, shippingPrice: 10 });
  const roi = calculateRoi(30, totalCost);
  assert.equal(Number.isFinite(suggestedPrice), true);
  assert.equal(suggestedPrice >= totalCost, true);
  assert.equal(roi, 50);
});

test('dedupeProducts removes duplicates', () => {
  const products = [
    normalizeProduct({ id: '1', title: 'A', url: 'https://x.test/a' }, 'mercadoLivre'),
    normalizeProduct({ id: '2', title: 'A', url: 'https://x.test/a' }, 'mercadoLivre')
  ];
  assert.equal(dedupeProducts(products).length, 1);
});

test('disabled provider reports disabled when credentials are absent', async () => {
  const oldKey = process.env.GOOGLE_SEARCH_API_KEY;
  const oldCx = process.env.GOOGLE_SEARCH_CX;
  delete process.env.GOOGLE_SEARCH_API_KEY;
  delete process.env.GOOGLE_SEARCH_CX;
  const health = await googleProvider.healthCheck();
  assert.equal(health.disabled, true);
  process.env.GOOGLE_SEARCH_API_KEY = oldKey;
  process.env.GOOGLE_SEARCH_CX = oldCx;
});

test('withTimeout rejects slow provider', async () => {
  await assert.rejects(withTimeout(new Promise((resolve) => setTimeout(resolve, 50)), 5), /timeout/);
});

test('invalid query returns status 400', () => {
  assert.throws(() => validateSearchInput('a'), /pelo menos 2/);
});

test('invalid image URL is rejected', () => {
  assert.equal(normalizeImageUrl('javascript:alert(1)'), null);
});

test('search returns empty state when no real sources return', async () => {
  const result = await searchProducts('zz produto teste local', { limit: 3, timeoutMs: 1, refresh: true });
  assert.equal(result.success, true);
  assert.equal(result.products.length, 0);
  assert.equal(result.meta.fallbackResults, 0);
  assert.equal(result.meta.message, 'Nenhuma fonte real retornou produtos agora.');
});

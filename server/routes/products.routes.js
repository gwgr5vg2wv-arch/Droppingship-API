import { Router } from 'express';
import { addToPublishQueue, getProductDetails, listProducts, publicSearchProducts, publishProduct, refreshProducts, saveProduct, searchAggregatedProducts, searchRealProducts } from '../controllers/products.controller.js';

const router = Router();
const hits = new Map();

function searchRateLimit(req, res, next) {
  const key = req.ip || req.headers['x-forwarded-for'] || 'local';
  const now = Date.now();
  const windowMs = 60_000;
  const current = (hits.get(key) || []).filter((time) => now - time < windowMs);
  if (current.length >= 30) return res.status(429).json({ error: 'Muitas buscas em pouco tempo. Tente novamente em instantes.' });
  current.push(now);
  hits.set(key, current);
  next();
}

router.get('/', listProducts);
router.get('/search', searchRateLimit, searchAggregatedProducts);
router.post('/save', saveProduct);
router.post('/publish-queue', addToPublishQueue);
router.post('/public-search', publicSearchProducts);
router.post('/search-real', searchRealProducts);
router.post('/refresh', searchRateLimit, refreshProducts);
router.post('/publish', publishProduct);
router.get('/:id', getProductDetails);

export default router;

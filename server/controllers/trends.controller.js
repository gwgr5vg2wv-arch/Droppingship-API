import { getTrendingProducts } from '../services/trends.service.js';
import { searchTrends } from '../../src/services/search/productSearch.service.js';

export async function listTrends(req, res, next) {
  try {
    if (req.query.q || req.query.category || req.query.page || req.query.limit) {
      const result = await searchTrends({
        q: req.query.q || req.query.category || 'produtos em alta',
        category: req.query.category || 'all',
        page: req.query.page || 1,
        limit: req.query.limit || 20,
        refresh: req.query.refresh === 'true'
      });
      return res.json({
        ...result,
        fallbackUsed: result.meta.fallbackResults > 0 && result.meta.realResults === 0,
        fallbackReason: result.meta.realResults === 0 ? 'no_real_sources' : null,
        products: result.products,
        categories: [{ category: req.query.category || 'Todos', items: result.products }]
      });
    }
    res.json(await getTrendingProducts());
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
}

import { searchTrends } from '../../src/services/search/productSearch.service.js';

export async function listTrends(req, res, next) {
  try {
    const result = await searchTrends({
      q: req.query.q || req.query.category || 'produtos em alta',
      category: req.query.category || 'all',
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      refresh: req.query.refresh === 'true'
    });
    res.json({
      ...result,
      fallbackUsed: false,
      fallbackReason: null,
      products: result.products,
      categories: result.products.length ? [{ category: req.query.category || 'Todos', items: result.products }] : []
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
}

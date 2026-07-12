import { readDb, writeDb } from '../services/dataStore.service.js';
import { searchProducts } from '../../src/services/search/productSearch.service.js';

export async function scanProducts(req, res, next) {
  try {
    const db = await readDb();
    const response = await searchProducts(req.body.query, {
      limit: req.body.limit || 20,
      refresh: req.body.refresh === true
    });

    db.products = response.products;
    await writeDb(db);
    res.json(response);
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
}

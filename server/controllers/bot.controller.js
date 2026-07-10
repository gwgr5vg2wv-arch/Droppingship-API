import { readDb, writeDb } from '../services/mockData.service.js';
import { researchProducts } from '../services/productResearch.service.js';

export async function scanProducts(req, res, next) {
  try {
    const db = await readDb();
    const products = await researchProducts({
      query: req.body.query,
      source: req.body.source || 'mock',
      marketplaceFeePercent: db.settings.defaultMarketplaceFeePercent
    });

    db.products = products;
    await writeDb(db);
    res.json({ products });
  } catch (error) {
    next(error);
  }
}

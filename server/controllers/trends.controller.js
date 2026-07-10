import { getTrendingProducts } from '../services/trends.service.js';

export async function listTrends(req, res, next) {
  try {
    res.json(await getTrendingProducts());
  } catch (error) {
    next(error);
  }
}

import { readDb } from '../services/dataStore.service.js';

export async function dashboardSummary(req, res, next) {
  try {
    const db = await readDb();
    const allProducts = [...db.products, ...db.savedProducts, ...db.publishQueue];
    const profitTotal = allProducts.reduce((sum, item) => sum + Number(item.profit || 0), 0);
    const roiItems = allProducts.filter((item) => Number.isFinite(Number(item.roi)));
    const averageRoi = roiItems.length
      ? roiItems.reduce((sum, item) => sum + Number(item.roi || 0), 0) / roiItems.length
      : 0;

    res.json({
      foundToday: db.products.length,
      savedProducts: db.savedProducts.length,
      publishQueue: db.publishQueue.length,
      orders: db.orders.length,
      simulatedOrders: 0,
      estimatedProfit: round(profitTotal),
      averageRoi: round(averageRoi)
    });
  } catch (error) {
    next(error);
  }
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}


import { readDb } from '../services/mockData.service.js';
import { createOrderRepository } from '../repositories/order.repository.js';
import { getOptionalWorkspaceContext } from '../utils/requestAuth.util.js';

export async function dashboardSummary(req, res, next) {
  try {
    const context = await getOptionalWorkspaceContext(req);
    if (context) {
      const summary = await createOrderRepository(context.prisma).workspaceSummary(context.workspaceId);
      const roiItems = summary.savedProducts
        .map((item) => Number(item.targetMargin || item.productSource?.rawData?.roi || 0))
        .filter((value) => Number.isFinite(value));
      return res.json({
        foundToday: 0,
        savedProducts: summary.savedProducts.length,
        publishQueue: summary.listings.length,
        simulatedOrders: summary.orders.length,
        estimatedProfit: round(summary.profitTotal || summary.savedPotentialProfit),
        averageRoi: round(roiItems.length ? roiItems.reduce((sum, value) => sum + value, 0) / roiItems.length : summary.averageRoi),
        stockTotal: summary.stockTotal,
        listingValue: summary.listingValue,
        storage: 'prisma'
      });
    }

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
      simulatedOrders: db.orders.length,
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

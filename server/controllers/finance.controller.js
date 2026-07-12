import { readDb } from '../services/mockData.service.js';
import { createOrderRepository } from '../repositories/order.repository.js';
import { getOptionalWorkspaceContext } from '../utils/requestAuth.util.js';

export async function financeSummary(req, res, next) {
  try {
    const context = await getOptionalWorkspaceContext(req);
    if (context) {
      const summary = await createOrderRepository(context.prisma).workspaceSummary(context.workspaceId);
      return res.json({
        revenueTotal: summary.revenueTotal,
        costTotal: summary.costTotal,
        profitTotal: summary.profitTotal,
        averageRoi: summary.averageRoi,
        shippingTotal: summary.shippingTotal,
        simulatedFees: summary.simulatedFees,
        stockTotal: summary.stockTotal,
        listingValue: summary.listingValue,
        storage: 'prisma'
      });
    }

    const db = await readDb();
    const orders = db.orders;
    const revenue = sum(orders, 'value');
    const profit = sum(orders, 'profit');
    const shipping = db.savedProducts.reduce((total, item) => total + Number(item.shippingCost || 0), 0);
    const fees = db.savedProducts.reduce((total, item) => total + Number(item.suggestedPrice || 0) * 0.14, 0);
    const cost = revenue - profit - fees;
    const averageRoi = cost > 0 ? (profit / cost) * 100 : 0;

    res.json({
      revenueTotal: round(revenue),
      costTotal: round(Math.max(cost, 0)),
      profitTotal: round(profit),
      averageRoi: round(averageRoi),
      shippingTotal: round(shipping),
      simulatedFees: round(fees)
    });
  } catch (error) {
    next(error);
  }
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

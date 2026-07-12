export function createOrderRepository(prisma) {
  return {
    listForWorkspace(workspaceId) {
      return prisma.order.findMany({
        where: { workspaceId },
        include: { items: true, integration: true },
        orderBy: { orderedAt: 'desc' }
      });
    },

    async workspaceSummary(workspaceId) {
      const [orders, savedProducts, listings] = await Promise.all([
        prisma.order.findMany({ where: { workspaceId }, include: { items: true } }),
        prisma.savedProduct.findMany({ where: { workspaceId }, include: { productSource: true } }),
        prisma.listing.findMany({ where: { workspaceId } })
      ]);

      const revenue = sum(orders, 'totalAmount');
      const profit = sum(orders, 'estimatedProfit');
      const fees = sum(orders, 'marketplaceFees');
      const shipping = sum(orders, 'shippingAmount');
      const savedPotentialProfit = savedProducts.reduce((total, item) => {
        const raw = item.productSource?.rawData || {};
        return total + Number(raw.estimatedProfit || raw.profit || 0);
      }, 0);
      const listingValue = listings.reduce((total, item) => total + Number(item.price || 0) * Number(item.stock || 0), 0);
      const stockTotal = listings.reduce((total, item) => total + Number(item.stock || 0), 0);
      const cost = Math.max(0, revenue - profit - fees);

      return {
        orders,
        savedProducts,
        listings,
        revenueTotal: round(revenue),
        costTotal: round(cost),
        profitTotal: round(profit),
        averageRoi: round(cost > 0 ? (profit / cost) * 100 : 0),
        shippingTotal: round(shipping),
        simulatedFees: round(fees),
        listingValue: round(listingValue),
        stockTotal,
        savedPotentialProfit: round(savedPotentialProfit)
      };
    }
  };
}

export function serializeOrder(order) {
  const firstItem = order.items?.[0];
  return {
    id: order.externalOrderId || order.id,
    orderId: order.id,
    product: firstItem?.title || order.provider,
    customer: order.buyerDataEncrypted ? 'Cliente protegido' : 'Cliente marketplace',
    status: order.status,
    value: Number(order.totalAmount || 0),
    profit: Number(order.estimatedProfit || 0),
    tracking: order.items?.length ? `${order.items.length} item(ns)` : 'Aguardando rastreio',
    marketplace: order.provider,
    currency: order.currency,
    createdAt: order.orderedAt?.toISOString?.() || order.updatedAt?.toISOString?.() || ''
  };
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

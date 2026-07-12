import { getMarketplaceClient } from '../services/marketplace.service.js';
import { getIntegrationMode, marketplaces, sanitizeError } from '../services/integrationMode.service.js';
import { readDb, writeDb } from '../services/mockData.service.js';
import { createOrderRepository, serializeOrder } from '../repositories/order.repository.js';
import { getOptionalWorkspaceContext } from '../utils/requestAuth.util.js';

export async function listOrders(req, res, next) {
  try {
    const context = await getOptionalWorkspaceContext(req);
    if (context) {
      const orders = await createOrderRepository(context.prisma).listForWorkspace(context.workspaceId);
      return res.json({ orders: orders.map(serializeOrder), storage: 'prisma' });
    }

    const db = await readDb();
    res.json({ orders: db.orders });
  } catch (error) {
    next(error);
  }
}

export async function syncOrders(req, res, next) {
  try {
    const context = await getOptionalWorkspaceContext(req);
    const db = await readDb();
    const mode = getIntegrationMode();
    if (context && mode === 'mock') {
      const orders = await createOrderRepository(context.prisma).listForWorkspace(context.workspaceId);
      return res.json({ orders: orders.map(serializeOrder), mode, fallbackUsed: false, storage: 'prisma' });
    }

    if (mode === 'mock') return res.json({ orders: db.orders, mode, fallbackUsed: false });

    const synced = [];
    const errors = [];

    for (const marketplace of marketplaces) {
      try {
        const client = getMarketplaceClient(marketplace);
        const result = await client.syncOrders({ db });
        synced.push(...(result.orders || []).map((order) => normalizeOrder(order, marketplace)));
        db.integrations[marketplace] = { ...db.integrations[marketplace], lastSyncAt: new Date().toISOString(), lastError: '' };
      } catch (error) {
        errors.push({ marketplace, error: sanitizeError(error) });
        db.integrations[marketplace] = { ...db.integrations[marketplace], status: 'erro', lastError: sanitizeError(error) };
      }
    }

    if (mode === 'real' && errors.length === marketplaces.length) {
      await writeDb(db);
      return res.status(400).json({ error: 'Nenhuma integracao conectada para sincronizar pedidos.', errors });
    }

    if (synced.length) db.orders = [...synced, ...db.orders];
    await writeDb(db);
    res.json({ orders: db.orders, mode, fallbackUsed: mode === 'hybrid' && synced.length === 0, errors });
  } catch (error) {
    next(error);
  }
}

function normalizeOrder(order, marketplace) {
  return {
    id: String(order.id || order.order_id || order.order_sn || `ORD-${Date.now()}`),
    product: order.product || order.item_title || marketplace,
    customer: order.customer || order.buyer?.nickname || 'Cliente marketplace',
    status: order.status || order.order_status || 'sincronizado',
    value: Number(order.total_amount || order.value || order.payment?.total_paid_amount || 0),
    profit: 0,
    tracking: order.tracking || order.tracking_number || 'Aguardando rastreio',
    marketplace,
    createdAt: new Date().toISOString()
  };
}

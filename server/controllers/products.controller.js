import { getMarketplaceClient } from '../services/marketplace.service.js';
import { getIntegrationMode, marketplaceLabels, marketplaces, normalizeMarketplace, sanitizeError } from '../services/integrationMode.service.js';
import { makeId, readDb, writeDb } from '../services/mockData.service.js';
import { researchProducts } from '../services/productResearch.service.js';

export async function listProducts(req, res, next) {
  try {
    const db = await readDb();
    res.json({
      products: db.products,
      savedProducts: db.savedProducts,
      publishQueue: db.publishQueue
    });
  } catch (error) {
    next(error);
  }
}

export async function saveProduct(req, res, next) {
  try {
    const db = await readDb();
    const product = req.body.product || req.body;
    const saved = {
      ...product,
      savedId: product.savedId || makeId('SAVE'),
      savedAt: new Date().toISOString()
    };

    if (!db.savedProducts.some((item) => item.id === saved.id)) {
      db.savedProducts.unshift(saved);
    }

    await writeDb(db);
    res.status(201).json({ product: saved, savedProducts: db.savedProducts });
  } catch (error) {
    next(error);
  }
}

export async function addToPublishQueue(req, res, next) {
  try {
    const db = await readDb();
    const product = req.body.product || req.body;
    const queued = {
      ...product,
      queueId: product.queueId || makeId('QUEUE'),
      status: product.status || 'pendente',
      queuedAt: new Date().toISOString()
    };

    if (!db.publishQueue.some((item) => item.id === queued.id)) {
      db.publishQueue.unshift(queued);
    }

    await writeDb(db);
    res.status(201).json({ product: queued, publishQueue: db.publishQueue });
  } catch (error) {
    next(error);
  }
}

export async function simulatePublication(req, res, next) {
  try {
    const db = await readDb();
    const { id } = req.body;
    db.publishQueue = db.publishQueue.map((item) => (
      item.id === id ? { ...item, status: 'simulado', publishedAt: new Date().toISOString() } : item
    ));
    await writeDb(db);
    res.json({ publishQueue: db.publishQueue });
  } catch (error) {
    next(error);
  }
}

export async function searchRealProducts(req, res, next) {
  try {
    const db = await readDb();
    const mode = getIntegrationMode();
    const marketplace = normalizeMarketplace(req.body.marketplace || req.body.source || 'mercadoLivre');
    const query = req.body.query || 'produto';

    if (!marketplace) return res.status(400).json({ error: 'Marketplace invalido.' });
    if (mode === 'mock') return res.json(await mockSearchResponse({ query, marketplace, mode }));

    try {
      const client = getMarketplaceClient(marketplace);
      const result = await client.searchProducts(query, { db });
      const products = normalizeRealProducts(result.products, marketplace, query);
      db.products = products;
      await writeDb(db);
      return res.json({ products, mode: 'real', marketplace, fallbackUsed: false });
    } catch (error) {
      if (mode === 'real') {
        return res.status(400).json({ error: sanitizeError(error), mode, marketplace });
      }
      const fallback = await mockSearchResponse({ query, marketplace, mode, errorMessage: sanitizeError(error) });
      return res.json(fallback);
    }
  } catch (error) {
    next(error);
  }
}

export async function publicSearchProducts(req, res, next) {
  try {
    const db = await readDb();
    const query = req.body.query || 'produto';
    const requestedSources = Array.isArray(req.body.sources) && req.body.sources.length
      ? req.body.sources.map(normalizeMarketplace).filter(Boolean)
      : marketplaces;
    const sources = {};
    const results = [];

    for (const source of requestedSources) {
      const client = getMarketplaceClient(source);
      try {
        const response = await client.publicSearch(query, { db });
        const normalized = await normalizePublicProducts(response.products || [], source, query, 'public');
        sources[source] = { ok: true, mode: 'public' };
        results.push(...normalized);
      } catch (error) {
        const reason = sanitizeError(error) || 'Busca publica bloqueada';
        const fallback = await researchProducts({ query, source });
        sources[source] = { ok: false, mode: 'fallback', reason };
        results.push(...fallback.slice(0, 4).map((product) => ({
          ...product,
          mode: 'fallback',
          publicSearchMode: 'fallback',
          fallbackReason: reason,
          sourceStatus: 'fallback',
          score: calculateProductScore(product)
        })));
      }
    }

    const ranked = results
      .map((product) => ({ ...product, score: product.score ?? calculateProductScore(product) }))
      .sort((a, b) => b.score - a.score);

    db.products = ranked;
    await writeDb(db);

    res.json({ query, results: ranked, products: ranked, sources });
  } catch (error) {
    next(error);
  }
}

export async function publishProduct(req, res, next) {
  try {
    const db = await readDb();
    const mode = getIntegrationMode();
    const marketplace = normalizeMarketplace(req.body.marketplace);
    const product = req.body.product || {};

    if (!marketplace) return res.status(400).json({ error: 'Marketplace invalido.' });
    if (!product.title && !product.generatedTitle) return res.status(400).json({ error: 'Produto invalido: informe ao menos o titulo.' });

    const baseQueueItem = {
      ...product,
      queueId: makeId('PUB'),
      marketplace,
      mode,
      publishedAt: new Date().toISOString()
    };

    if (mode === 'mock') {
      const queued = {
        ...baseQueueItem,
        status: 'simulado',
        externalId: makeId('MOCK-PUB'),
        errorMessage: ''
      };
      db.publishQueue.unshift(queued);
      await writeDb(db);
      return res.status(201).json({ product: queued, fallbackUsed: false });
    }

    try {
      const client = getMarketplaceClient(marketplace);
      const result = await client.publishProduct(product, { db });
      const queued = {
        ...baseQueueItem,
        status: 'publicado',
        externalId: result.externalId || makeId('REAL-PUB'),
        errorMessage: ''
      };
      db.publishQueue.unshift(queued);
      await writeDb(db);
      return res.status(201).json({ product: queued, fallbackUsed: false });
    } catch (error) {
      const errorMessage = sanitizeError(error);
      const queued = {
        ...baseQueueItem,
        status: mode === 'hybrid' ? 'erro' : 'erro',
        externalId: '',
        errorMessage: `${errorMessage} Sugestao: revise credenciais, token e campos obrigatorios do anuncio.`
      };
      db.publishQueue.unshift(queued);
      db.integrations[marketplace] = {
        ...db.integrations[marketplace],
        status: 'erro',
        lastError: errorMessage
      };
      await writeDb(db);

      if (mode === 'real') return res.status(400).json({ error: errorMessage, product: queued });
      return res.status(201).json({ product: queued, fallbackUsed: true, error: errorMessage });
    }
  } catch (error) {
    next(error);
  }
}

async function mockSearchResponse({ query, marketplace, mode, errorMessage = '' }) {
  const products = await researchProducts({ query, source: marketplace });
  return {
    products: products.map((product) => ({ ...product, mode: mode === 'mock' ? 'mock' : 'hybrid', fallbackUsed: Boolean(errorMessage) })),
    mode,
    marketplace,
    fallbackUsed: Boolean(errorMessage),
    errorMessage
  };
}

function normalizeRealProducts(products = [], marketplace, query) {
  if (!products.length) return [];
  return products.slice(0, 10).map((item, index) => ({
    id: String(item.id || item.item_id || item.product_id || makeId('REAL')),
    title: item.title || item.name || item.item_name || `${marketplaceLabels[marketplace]} ${query}`,
    source: marketplace,
    mode: 'real',
    supplierPrice: Number(item.price || item.sale_price || item.current_price || 0),
    shippingCost: 0,
    suggestedPrice: Number(item.price || item.sale_price || item.current_price || 0),
    profit: 0,
    roi: 0,
    rating: Number(item.rating_average || item.rating || 0),
    sold: Number(item.sold_quantity || item.historical_sold || item.sales || 0),
    deliveryDays: 0,
    trendScore: 70 + index,
    competitionLevel: 'media',
    riskLevel: 'medio',
    image: item.thumbnail || item.image || '/Droppingship/assets/img/product-card.svg',
    generatedTitle: item.title || item.name || `${marketplaceLabels[marketplace]} ${query}`,
    generatedDescription: 'Produto retornado por integracao oficial preparada.',
    tags: ['real', marketplace, 'integracao'],
    recommendation: 'Validar dados oficiais antes de publicar.'
  }));
}

async function normalizePublicProducts(products = [], marketplace, query, mode) {
  const normalized = products.slice(0, 20).map((item, index) => {
    const price = Number(item.price || item.sale_price || item.current_price || item.original_price || 0);
    const sold = Number(item.sold_quantity || item.historical_sold || item.sales || item.orders || 0);
    const shippingCost = Number(item.shipping?.free_shipping ? 0 : item.shippingCost || 12);
    const supplierPrice = price ? roundNumber(price * 0.62) : 0;
    const profit = price ? roundNumber(price - supplierPrice - shippingCost - price * 0.14) : 0;
    const roi = supplierPrice + shippingCost > 0 ? roundNumber((profit / (supplierPrice + shippingCost)) * 100) : 0;
    const product = {
      id: String(item.id || item.item_id || item.product_id || makeId('PUBLIC')),
      title: item.title || item.name || item.item_name || `${marketplaceLabels[marketplace]} ${query}`,
      source: marketplace,
      mode,
      publicSearchMode: mode,
      sourceStatus: 'public',
      supplierPrice,
      shippingCost,
      suggestedPrice: price,
      profit,
      roi,
      rating: Number(item.rating_average || item.rating || 4.4),
      sold,
      deliveryDays: item.deliveryDays || (item.shipping?.logistic_type === 'fulfillment' ? 3 : 8),
      trendScore: Math.min(100, 62 + index + Math.floor(sold / 20)),
      competitionLevel: sold > 500 ? 'alta' : sold > 120 ? 'media' : 'baixa',
      riskLevel: shippingCost === 0 && sold > 100 ? 'baixo' : 'medio',
      image: item.thumbnail || item.image || item.pictures?.[0]?.url || '/Droppingship/assets/img/product-card.svg',
      generatedTitle: item.title || item.name || `${marketplaceLabels[marketplace]} ${query}`,
      generatedDescription: 'Produto encontrado em busca publica. Prepare o anuncio e conecte a conta para publicar.',
      tags: ['busca-publica', marketplace, mode],
      recommendation: 'Bom candidato para preparar anuncio antes de conectar OAuth.'
    };
    return { ...product, score: calculateProductScore(product) };
  });

  return normalized;
}

function calculateProductScore(product) {
  const demand = Number(product.trendScore || 0) * 0.26;
  const price = Math.min(100, Number(product.suggestedPrice || 0)) * 0.08;
  const margin = Math.max(0, Math.min(100, Number(product.roi || 0))) * 0.24;
  const shipping = Math.max(0, 100 - Number(product.shippingCost || 0) * 4) * 0.12;
  const sold = Math.min(100, Number(product.sold || 0) / 8) * 0.2;
  const risk = ({ baixo: 100, medio: 62, alto: 22 }[product.riskLevel] || 55) * 0.1;
  return roundNumber(demand + price + margin + shipping + sold + risk);
}

function roundNumber(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

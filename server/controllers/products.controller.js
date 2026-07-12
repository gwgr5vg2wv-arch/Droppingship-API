import { getMarketplaceClient } from '../services/marketplace.service.js';
import { marketplaceLabels, marketplaces, normalizeMarketplace, sanitizeError } from '../services/integrationMode.service.js';
import { makeId, readDb, writeDb } from '../services/dataStore.service.js';
import { getProductById, searchProducts as aggregateSearchProducts } from '../../src/services/search/productSearch.service.js';
import { normalizeProduct } from '../../src/services/search/normalizeProduct.js';
import { featureFlags } from '../config/env.js';

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

export async function searchAggregatedProducts(req, res, next) {
  try {
    const response = await aggregateSearchProducts(req.query.q, {
      page: req.query.page,
      limit: req.query.limit,
      category: req.query.category,
      refresh: req.query.refresh === 'true'
    });
    res.json(response);
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
}

export async function getProductDetails(req, res, next) {
  try {
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto nao encontrado.' });
    res.json({ product });
  } catch (error) {
    next(error);
  }
}

export async function refreshProducts(req, res, next) {
  try {
    const query = req.body.q || req.body.query || req.query.q;
    const response = await aggregateSearchProducts(query, {
      page: req.body.page || req.query.page,
      limit: req.body.limit || req.query.limit,
      category: req.body.category || req.query.category,
      refresh: true
    });
    res.json(response);
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    next(error);
  }
}

export async function saveProduct(req, res, next) {
  try {
    const db = await readDb();
    const product = req.body.product || req.body;
    if (product?.isFallback) {
      return res.status(400).json({ error: 'Produtos sem fonte real nao podem ser salvos.' });
    }

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
    if (product?.isFallback) {
      return res.status(400).json({ error: 'Produtos sem fonte real nao podem ir para publicacao.' });
    }

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

export async function searchRealProducts(req, res, next) {
  try {
    const db = await readDb();
    const marketplace = normalizeMarketplace(req.body.marketplace || req.body.source || 'mercadoLivre');
    const query = req.body.query || 'produto';

    if (!marketplace) return res.status(400).json({ error: 'Marketplace invalido.' });

    try {
      const client = getMarketplaceClient(marketplace);
      const result = await client.searchProducts(query, { db });
      const products = normalizeRealProducts(result.products, marketplace, query);
      db.products = products;
      await writeDb(db);
      return res.json({ source: marketplace, fallbackUsed: false, fallbackReason: null, products, mode: 'real', marketplace });
    } catch (error) {
      return res.status(400).json({ error: sanitizeError(error), mode: 'real', marketplace });
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
        const responseMode = response.mode === 'real' ? 'real' : 'public';
        const normalized = await normalizePublicProducts(response.products || [], source, query, responseMode);
        sources[source] = { ok: true, mode: responseMode, source, fallbackUsed: false, fallbackReason: null };
        results.push(...normalized);
      } catch (error) {
        sources[source] = { ok: false, mode: 'unavailable', source, fallbackUsed: false, fallbackReason: null, message: sanitizeError(error) };
        console.warn(`[SEARCH] provider=${source} status=failed`);
      }
    }

    const ranked = results.sort((a, b) => Number(b.soldCount || 0) - Number(a.soldCount || 0));
    db.products = ranked;
    await writeDb(db);

    res.json({
      success: true,
      query,
      source: requestedSources[0] || null,
      fallbackUsed: false,
      fallbackReason: null,
      results: ranked,
      products: ranked,
      sources,
      meta: {
        total: ranked.length,
        realResults: ranked.length,
        providers: ranked.length ? Object.values(sources) : [],
        message: ranked.length ? null : 'Nenhuma fonte real retornou produtos agora.'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function publishProduct(req, res, next) {
  try {
    const db = await readDb();
    const marketplace = normalizeMarketplace(req.body.marketplace);
    const product = req.body.product || {};

    if (!marketplace) return res.status(400).json({ error: 'Marketplace invalido.' });

    const validation = validateProductForPublication(product, marketplace, db);
    if (!validation.valid) return res.status(400).json({ success: false, errors: validation.errors });

    if (!featureFlags.marketplaceWriteEnabled) {
      const blocked = {
        ...product,
        queueId: makeId('PUB-BLOCKED'),
        marketplace,
        status: 'bloqueado',
        errorMessage: 'MARKETPLACE_WRITE_ENABLED=false. Publicacao real bloqueada por seguranca.',
        attemptedAt: new Date().toISOString()
      };
      db.publishQueue.unshift(blocked);
      await writeDb(db);
      console.warn(`[PUBLISH] marketplace=${marketplace} status=blocked reason=write_disabled`);
      return res.status(403).json({
        success: false,
        error: 'Escrita em marketplaces desativada. Configure MARKETPLACE_WRITE_ENABLED=true somente apos testes e aprovacao.',
        product: blocked
      });
    }

    const baseQueueItem = {
      ...product,
      queueId: makeId('PUB'),
      marketplace,
      publishedAt: new Date().toISOString()
    };

    try {
      const client = getMarketplaceClient(marketplace);
      const result = await client.publishProduct(product, { db });
      const queued = {
        ...baseQueueItem,
        status: 'publicado',
        externalId: result.externalId || null,
        permalink: result.permalink || null,
        errorMessage: ''
      };
      db.publishQueue.unshift(queued);
      db.publications.unshift({ ...queued, response: sanitizePublicationResponse(result.raw) });
      await writeDb(db);
      return res.status(201).json({ success: true, product: queued, fallbackUsed: false });
    } catch (error) {
      const errorMessage = sanitizeError(error);
      const queued = {
        ...baseQueueItem,
        status: 'erro',
        externalId: '',
        errorMessage
      };
      db.publishQueue.unshift(queued);
      db.integrations[marketplace] = {
        ...db.integrations[marketplace],
        status: 'erro',
        lastError: errorMessage
      };
      await writeDb(db);
      return res.status(400).json({ success: false, error: errorMessage, product: queued });
    }
  } catch (error) {
    next(error);
  }
}

function normalizeRealProducts(products = [], marketplace, query) {
  if (!products.length) return [];
  return products.slice(0, 10).map((item) => normalizeProduct({
    id: String(item.id || item.item_id || item.product_id || `${marketplace}-${query}`),
    externalId: item.id || item.item_id || item.product_id || null,
    title: item.title || item.name || item.item_name || `${marketplaceLabels[marketplace]} ${query}`,
    source: marketplace,
    marketplace,
    supplierPrice: item.price ?? item.sale_price ?? item.current_price ?? null,
    shippingCost: item.shipping?.free_shipping ? 0 : null,
    suggestedPrice: item.price ?? item.sale_price ?? item.current_price ?? null,
    rating: item.rating_average ?? item.rating ?? null,
    sold: item.sold_quantity ?? item.historical_sold ?? item.sales ?? null,
    condition: item.condition || null,
    seller: item.seller || null,
    category: item.category_id || item.category || null,
    attributes: item.attributes || [],
    image: item.thumbnail || item.secure_thumbnail || item.image || item.pictures?.[0]?.url,
    images: [item.thumbnail, item.secure_thumbnail, item.image, item.pictures?.[0]?.url].filter(Boolean),
    url: item.permalink,
    fetchedAt: new Date().toISOString(),
    isFallback: false
  }, marketplace));
}

async function normalizePublicProducts(products = [], marketplace, query, mode) {
  return products.slice(0, 20).map((item) => normalizeProduct({
    id: String(item.id || item.item_id || item.product_id || `${marketplace}-${query}`),
    externalId: item.id || item.item_id || item.product_id || null,
    title: item.title || item.name || item.item_name || `${marketplaceLabels[marketplace]} ${query}`,
    source: marketplace,
    marketplace,
    mode,
    supplierPrice: item.price ?? item.sale_price ?? item.current_price ?? item.original_price ?? null,
    shippingCost: item.shipping?.free_shipping ? 0 : null,
    suggestedPrice: item.price ?? item.sale_price ?? item.current_price ?? item.original_price ?? null,
    rating: item.rating_average ?? item.rating ?? null,
    sold: item.sold_quantity ?? item.historical_sold ?? item.sales ?? item.orders ?? null,
    condition: item.condition || null,
    seller: item.seller || null,
    category: item.category_id || item.category || null,
    attributes: item.attributes || [],
    image: item.thumbnail || item.secure_thumbnail || item.image || item.pictures?.[0]?.url,
    images: [item.thumbnail, item.secure_thumbnail, item.image, item.pictures?.[0]?.url].filter(Boolean),
    url: item.permalink,
    tags: ['busca-publica', marketplace, mode],
    fetchedAt: new Date().toISOString(),
    isFallback: false
  }, marketplace));
}

function validateProductForPublication(product, marketplace, db) {
  const integration = db.integrations?.[marketplace] || {};
  const errors = [];

  if (!integration.connected && !integration.accessToken) {
    errors.push({ field: 'account', message: 'Conta obrigatoria. Conecte a conta oficial antes de publicar.' });
  }
  if (!product.title && !product.generatedTitle) errors.push({ field: 'title', message: 'Titulo obrigatorio.' });
  if (!product.category) errors.push({ field: 'category', message: 'Categoria obrigatoria.' });
  if (product.suggestedPrice == null && product.salePrice == null) errors.push({ field: 'price', message: 'Preco obrigatorio.' });
  if (product.stock == null) errors.push({ field: 'stock', message: 'Estoque obrigatorio.' });
  if (!product.condition) errors.push({ field: 'condition', message: 'Condicao obrigatoria.' });
  if (!Array.isArray(product.images) || !product.images.length) errors.push({ field: 'images', message: 'Ao menos uma imagem real obrigatoria.' });
  if (!product.description && !product.generatedDescription) errors.push({ field: 'description', message: 'Descricao obrigatoria.' });

  return { valid: errors.length === 0, errors };
}

function sanitizePublicationResponse(raw = {}) {
  if (!raw || typeof raw !== 'object') return {};
  const { access_token, refresh_token, token, ...safe } = raw;
  return safe;
}

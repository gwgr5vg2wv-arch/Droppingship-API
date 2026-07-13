import { getMarketplaceClient } from '../services/marketplace.service.js';
import { getIntegrationMode, marketplaceLabels, marketplaces, normalizeMarketplace, sanitizeError } from '../services/integrationMode.service.js';
import { makeId, readDb, writeDb } from '../services/mockData.service.js';
import { researchProducts } from '../services/productResearch.service.js';
import { fallbackReasonFor, normalizeProduct } from '../services/productNormalization.service.js';
import { createProductRepository, serializeSavedProduct } from '../repositories/product.repository.js';
import { createListingRepository, serializeListing } from '../repositories/listing.repository.js';
import { createIntegrationRepository } from '../repositories/integration.repository.js';
import { getOptionalWorkspaceContext } from '../utils/requestAuth.util.js';
import { decryptSecret } from '../utils/crypto.util.js';
import { featureFlags } from '../config/env.js';
import { getProductById, searchProducts as aggregateSearchProducts } from '../../src/services/search/productSearch.service.js';

export async function listProducts(req, res, next) {
  try {
    const db = await readDb();
    const context = await getOptionalWorkspaceContext(req);
    const savedProducts = context
      ? (await createProductRepository(context.prisma).listSavedProducts(context.workspaceId)).map(serializeSavedProduct)
      : db.savedProducts;
    const publishQueue = context
      ? (await createListingRepository(context.prisma).listForWorkspace(context.workspaceId)).map(serializeListing)
      : db.publishQueue;
    res.json({
      products: db.products,
      savedProducts,
      publishQueue
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
    const context = await getOptionalWorkspaceContext(req);

    if (context) {
      const saved = await createProductRepository(context.prisma).saveProduct(context.workspaceId, normalizeProduct(product, product.marketplace || product.source));
      const savedProducts = (await createProductRepository(context.prisma).listSavedProducts(context.workspaceId)).map(serializeSavedProduct);
      return res.status(201).json({ product: serializeSavedProduct(saved), savedProducts, storage: 'prisma' });
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
    const context = await getOptionalWorkspaceContext(req);

    if (context) {
      const result = await prepareListingDraft(context, product);
      return res.status(201).json(result);
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
      return res.json({ source: marketplace, fallbackUsed: false, fallbackReason: null, products, mode: 'real', marketplace });
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
    const context = await getOptionalWorkspaceContext(req);
    const query = req.body.query || 'produto';
    const requestedSources = Array.isArray(req.body.sources) && req.body.sources.length
      ? req.body.sources.map(normalizeMarketplace).filter(Boolean)
      : marketplaces;
    const sources = {};
    const results = [];
    const providerState = {};
    const failedSources = [];

    for (const source of requestedSources) {
      const client = getMarketplaceClient(source);
      let accessToken = '';
      try {
        if (providerState[source]?.blocked) throw providerState[source].error;
        accessToken = await workspaceAccessToken(context, source);
        const response = await client.publicSearch(query, { db, accessToken });
        const responseMode = response.mode === 'real' ? 'real' : 'public';
        const normalized = await normalizePublicProducts(response.products || [], source, query, responseMode);
        if (!normalized.length) {
          const empty = new Error('Fonte oficial nao retornou produtos reais para essa busca.');
          empty.publicMessage = 'Fonte oficial nao retornou produtos reais para essa busca.';
          empty.status = 204;
          throw empty;
        }
        sources[source] = { ok: true, mode: responseMode, source, authenticated: Boolean(accessToken), fallbackUsed: false, fallbackReason: null };
        results.push(...normalized);
      } catch (error) {
        const fallbackReason = accessToken && [403, 429].includes(error?.status || error?.response?.status)
          ? 'official_search_blocked'
          : fallbackReasonFor(error);
        providerState[source] = { blocked: true, error };
        console.warn(`[MarketplaceProvider] ${source} indisponivel (${fallbackReason}).`);
        sources[source] = { ok: false, mode: 'unavailable', source, authenticated: Boolean(accessToken), fallbackUsed: true, fallbackReason, message: sanitizeError(error) };
        failedSources.push({ source, fallbackReason, message: sanitizeError(error) });
      }
    }

    const ranked = results
      .map((product) => ({ ...product, score: product.score ?? calculateProductScore(product) }))
      .sort((a, b) => b.score - a.score);

    if (ranked.length) {
      db.products = ranked;
      await writeDb(db);
    }

    const fallbackEntry = failedSources[0] || Object.values(sources).find((item) => item.fallbackUsed);
    res.json({
      query,
      source: fallbackEntry ? 'hybrid' : (requestedSources[0] || 'mock'),
      fallbackUsed: Boolean(fallbackEntry),
      fallbackReason: fallbackEntry?.fallbackReason || null,
      message: ranked.length ? '' : 'Nenhuma fonte retornou produtos reais com foto para essa busca. Conecte OAuth ou revise credenciais/permissoes oficiais.',
      results: ranked,
      products: ranked,
      sources
    });
  } catch (error) {
    next(error);
  }
}

async function workspaceAccessToken(context, marketplace) {
  if (!context) return '';
  const integration = await createIntegrationRepository(context.prisma).findByWorkspaceAndProvider(context.workspaceId, marketplace);
  if (!integration?.accessTokenEncrypted) return '';
  try {
    return decryptSecret(integration.accessTokenEncrypted);
  } catch {
    return '';
  }
}

export async function publishProduct(req, res, next) {
  try {
    const db = await readDb();
    const mode = getIntegrationMode();
    const marketplace = normalizeMarketplace(req.body.marketplace);
    const product = req.body.product || {};
    const context = await getOptionalWorkspaceContext(req);

    if (!marketplace) return res.status(400).json({ error: 'Marketplace invalido.' });
    if (!product.title && !product.generatedTitle) return res.status(400).json({ error: 'Produto invalido: informe ao menos o titulo.' });
    if (context) {
      const result = await publishProductWithPrisma(context, marketplace, product);
      return res.status(result.status).json(result.body);
    }

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

async function prepareListingDraft(context, product, forcedMarketplace, status = 'draft') {
  const marketplace = normalizeMarketplace(forcedMarketplace || product.marketplace || product.source || 'mercadoLivre') || 'mercadoLivre';
  const productRepository = createProductRepository(context.prisma);
  const listingRepository = createListingRepository(context.prisma);
  const normalized = normalizeProduct({ ...product, marketplace, source: marketplace }, marketplace);
  const saved = await productRepository.saveProduct(context.workspaceId, normalized);
  const integration = await listingRepository.findIntegration(context.workspaceId, marketplace);

  if (!integration || integration.status !== 'connected') {
    const savedProducts = (await productRepository.listSavedProducts(context.workspaceId)).map(serializeSavedProduct);
    return {
      product: {
        ...serializeSavedProduct(saved),
        status: 'aguardando_integracao',
        marketplace
      },
      savedProducts,
      publishQueue: (await listingRepository.listForWorkspace(context.workspaceId)).map(serializeListing),
      requiresConnection: true,
      message: 'Conecte a conta oficial para criar o anuncio neste marketplace.',
      storage: 'prisma'
    };
  }

  const listing = await listingRepository.upsertDraft(context.workspaceId, integration.id, saved.id, marketplace, normalized, status);
  return {
    product: serializeListing(listing),
    publishQueue: (await listingRepository.listForWorkspace(context.workspaceId)).map(serializeListing),
    requiresConnection: false,
    storage: 'prisma'
  };
}

async function publishProductWithPrisma(context, marketplace, product) {
  const listingRepository = createListingRepository(context.prisma);
  const draft = await prepareListingDraft(context, product, marketplace, featureFlags.marketplaceWriteEnabled ? 'ready' : 'blocked');

  if (draft.requiresConnection) {
    return { status: 201, body: { ...draft, fallbackUsed: true } };
  }

  if (!featureFlags.marketplaceWriteEnabled) {
    return {
      status: 201,
      body: {
        ...draft,
        fallbackUsed: true,
        error: 'Publicacao real bloqueada por MARKETPLACE_WRITE_ENABLED=false.'
      }
    };
  }

  const integration = await listingRepository.findIntegration(context.workspaceId, marketplace);
  const accessToken = decryptSecret(integration?.accessTokenEncrypted || '');
  if (!accessToken) {
    return {
      status: 400,
      body: {
        ...draft,
        fallbackUsed: true,
        error: 'Token OAuth ausente. Reconecte a conta oficial.'
      }
    };
  }

  try {
    const client = getMarketplaceClient(marketplace);
    const result = await client.publishProduct(product, {
      db: {
        integrations: {
          [marketplace]: {
            connected: true,
            accessToken
          }
        }
      }
    });
    const published = await listingRepository.markPublished(draft.product.listingId, {
      externalListingId: result.externalId || '',
      permalink: result.raw?.permalink || ''
    });
    return { status: 201, body: { product: serializeListing(published), fallbackUsed: false, storage: 'prisma' } };
  } catch (error) {
    const message = sanitizeError(error);
    if (draft.product.listingId) await listingRepository.markError(draft.product.listingId, message);
    return {
      status: 400,
      body: {
        ...draft,
        fallbackUsed: true,
        error: message
      }
    };
  }
}

async function mockSearchResponse({ query, marketplace, mode, errorMessage = '' }) {
  const products = await researchProducts({ query, source: marketplace });
  return {
    source: mode === 'mock' ? 'mock' : 'hybrid',
    products: products.map((product) => normalizeProduct({ ...product, mode: mode === 'mock' ? 'mock' : 'hybrid', isFallback: true }, marketplace)),
    mode,
    marketplace,
    fallbackUsed: Boolean(errorMessage),
    fallbackReason: errorMessage ? 'auth_required' : null,
    errorMessage: ''
  };
}

function normalizeRealProducts(products = [], marketplace, query) {
  if (!products.length) return [];
  return products.slice(0, 10).map((item, index) => normalizeProduct({
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
    image: item.image || item.secure_thumbnail || item.thumbnail || item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url,
    thumbnail: item.thumbnail || item.secure_thumbnail || '',
    thumbnailId: item.thumbnail_id || item.thumbnailId || '',
    images: [
      item.image,
      item.secure_thumbnail,
      item.thumbnail,
      ...(Array.isArray(item.images) ? item.images : []),
      ...(Array.isArray(item.pictures) ? item.pictures.map((picture) => picture?.secure_url || picture?.url) : [])
    ].filter(Boolean),
    productUrl: item.permalink,
    generatedTitle: item.title || item.name || `${marketplaceLabels[marketplace]} ${query}`,
    generatedDescription: 'Produto retornado por integracao oficial preparada.',
    tags: ['real', marketplace, 'integracao'],
    recommendation: 'Validar dados oficiais antes de publicar.',
    isFallback: false
  }, marketplace));
}

async function normalizePublicProducts(products = [], marketplace, query, mode) {
  const normalized = products.slice(0, 20).map((item, index) => {
    const price = Number(item.price || item.sale_price || item.current_price || item.original_price || 0);
    const sold = Number(item.sold_quantity || item.historical_sold || item.sales || item.orders || 0);
    const shippingCost = Number(item.shipping?.free_shipping ? 0 : item.shippingCost || 12);
    const supplierPrice = price ? roundNumber(price * 0.62) : 0;
    const profit = price ? roundNumber(price - supplierPrice - shippingCost - price * 0.14) : 0;
    const roi = supplierPrice + shippingCost > 0 ? roundNumber((profit / (supplierPrice + shippingCost)) * 100) : 0;
    const product = normalizeProduct({
      id: String(item.id || item.item_id || item.product_id || makeId('PUBLIC')),
      title: item.title || item.name || item.item_name || `${marketplaceLabels[marketplace]} ${query}`,
      source: marketplace,
      mode,
      publicSearchMode: mode,
      sourceStatus: mode === 'real' ? 'real' : 'public',
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
      image: item.image || item.secure_thumbnail || item.thumbnail || item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url,
      thumbnail: item.thumbnail || item.secure_thumbnail || '',
      thumbnailId: item.thumbnail_id || item.thumbnailId || '',
      images: [
        item.image,
        item.secure_thumbnail,
        item.thumbnail,
        ...(Array.isArray(item.images) ? item.images : []),
        ...(Array.isArray(item.pictures) ? item.pictures.map((picture) => picture?.secure_url || picture?.url) : [])
      ].filter(Boolean),
      productUrl: item.permalink,
      generatedTitle: item.title || item.name || `${marketplaceLabels[marketplace]} ${query}`,
      generatedDescription: mode === 'real'
        ? 'Produto retornado por integracao oficial. Valide estoque, frete e regras antes de publicar.'
        : 'Produto encontrado em busca publica. Prepare o anuncio e conecte a conta para publicar.',
      tags: ['busca-publica', marketplace, mode],
      recommendation: 'Bom candidato para preparar anuncio antes de conectar OAuth.',
      isFallback: false
    }, marketplace);
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

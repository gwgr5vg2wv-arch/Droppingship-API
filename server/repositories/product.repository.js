const providers = new Set(['mercadoLivre', 'aliexpress', 'shopee', 'tiktokShop', 'amazon', 'temu']);

export function createProductRepository(prisma) {
  return {
    async saveProduct(workspaceId, product) {
      const provider = normalizeProvider(product.marketplace || product.source);
      const externalProductId = String(product.externalId || product.id);
      const source = await prisma.productSource.upsert({
        where: {
          provider_externalProductId: {
            provider,
            externalProductId
          }
        },
        create: productSourceData(provider, externalProductId, product),
        update: productSourceData(provider, externalProductId, product)
      });

      const existing = await prisma.savedProduct.findFirst({
        where: {
          workspaceId,
          productSourceId: source.id
        },
        include: { productSource: true }
      });

      if (existing) {
        return prisma.savedProduct.update({
          where: { id: existing.id },
          data: savedProductData(product),
          include: { productSource: true }
        });
      }

      return prisma.savedProduct.create({
        data: {
          workspaceId,
          productSourceId: source.id,
          ...savedProductData(product)
        },
        include: { productSource: true }
      });
    },

    listSavedProducts(workspaceId) {
      return prisma.savedProduct.findMany({
        where: { workspaceId },
        include: { productSource: true },
        orderBy: { updatedAt: 'desc' }
      });
    }
  };
}

export function serializeSavedProduct(saved) {
  const source = saved.productSource || {};
  return {
    savedId: saved.id,
    id: source.externalProductId || saved.id,
    externalId: source.externalProductId || '',
    title: source.title || 'Produto salvo',
    description: source.description || '',
    source: source.provider || 'mercadoLivre',
    marketplace: source.provider || 'mercadoLivre',
    productUrl: source.sourceUrl || '',
    url: source.sourceUrl || '',
    image: source.rawData?.image || source.rawData?.thumbnail || '',
    images: source.rawData?.images || [],
    supplierPrice: decimalToNumber(source.rawData?.supplierPrice ?? source.sourcePrice),
    suggestedPrice: decimalToNumber(saved.targetPrice ?? source.rawData?.suggestedPrice ?? source.sourcePrice),
    shippingCost: decimalToNumber(source.shippingCost),
    shippingPrice: decimalToNumber(source.shippingCost),
    rating: decimalToNumber(source.rating),
    soldQuantity: Number(source.orderCount || 0),
    sold: Number(source.orderCount || 0),
    status: saved.status,
    notes: saved.notes || '',
    savedAt: saved.createdAt?.toISOString?.() || '',
    updatedAt: saved.updatedAt?.toISOString?.() || ''
  };
}

function productSourceData(provider, externalProductId, product) {
  return {
    provider,
    externalProductId,
    title: String(product.title || product.generatedTitle || 'Produto sem titulo').slice(0, 300),
    description: product.description || product.generatedDescription || '',
    sourceUrl: product.url || product.productUrl || '',
    sellerId: product.sellerId ? String(product.sellerId) : null,
    sellerName: product.seller || product.sellerName || '',
    currency: product.currency || 'BRL',
    sourcePrice: nullableDecimal(product.supplierPrice ?? product.price ?? product.salePrice ?? product.suggestedPrice),
    sourceStock: nullableInt(product.stock ?? product.available_quantity),
    shippingCost: nullableDecimal(product.shippingCost ?? product.shippingPrice),
    rating: nullableDecimal(product.rating),
    reviewCount: nullableInt(product.reviewCount ?? product.reviews),
    orderCount: nullableInt(product.soldQuantity ?? product.sold ?? product.sold_quantity),
    category: product.category || '',
    attributes: Array.isArray(product.attributes) ? product.attributes : [],
    rawData: product,
    lastSyncedAt: new Date()
  };
}

function savedProductData(product) {
  return {
    status: product.status || 'saved',
    notes: product.notes || '',
    targetPrice: nullableDecimal(product.targetPrice ?? product.suggestedPrice ?? product.salePrice),
    targetMargin: nullableDecimal(product.targetMargin ?? product.roi)
  };
}

function normalizeProvider(provider = '') {
  return providers.has(provider) ? provider : 'mercadoLivre';
}

function nullableDecimal(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableInt(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function decimalToNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

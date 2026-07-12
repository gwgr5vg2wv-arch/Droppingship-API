export function createListingRepository(prisma) {
  return {
    findIntegration(workspaceId, provider) {
      return prisma.integration.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId,
            provider
          }
        }
      });
    },

    async upsertDraft(workspaceId, integrationId, savedProductId, provider, product, status = 'draft') {
      const existing = await prisma.listing.findFirst({
        where: { workspaceId, integrationId, savedProductId },
        include: { savedProduct: { include: { productSource: true } }, integration: true }
      });

      const data = listingData(workspaceId, integrationId, savedProductId, provider, product, status);
      if (existing) {
        return prisma.listing.update({
          where: { id: existing.id },
          data,
          include: { savedProduct: { include: { productSource: true } }, integration: true }
        });
      }

      return prisma.listing.create({
        data,
        include: { savedProduct: { include: { productSource: true } }, integration: true }
      });
    },

    markPublished(id, data) {
      return prisma.listing.update({
        where: { id },
        data: {
          status: 'published',
          externalListingId: data.externalListingId,
          permalink: data.permalink,
          publishedAt: new Date(),
          lastSyncedAt: new Date()
        },
        include: { savedProduct: { include: { productSource: true } }, integration: true }
      });
    },

    markError(id, message) {
      return prisma.listing.update({
        where: { id },
        data: {
          status: 'error',
          attributes: [{ type: 'error', message, at: new Date().toISOString() }]
        },
        include: { savedProduct: { include: { productSource: true } }, integration: true }
      });
    },

    listForWorkspace(workspaceId) {
      return prisma.listing.findMany({
        where: { workspaceId },
        include: { savedProduct: { include: { productSource: true } }, integration: true },
        orderBy: { id: 'desc' }
      });
    }
  };
}

export function serializeListing(listing) {
  const source = listing.savedProduct?.productSource || {};
  return {
    queueId: listing.id,
    id: source.externalProductId || listing.id,
    listingId: listing.id,
    externalId: listing.externalListingId || '',
    title: listing.title,
    generatedTitle: listing.title,
    description: listing.description || '',
    generatedDescription: listing.description || '',
    marketplace: listing.provider,
    source: listing.provider,
    status: listing.status,
    productUrl: source.sourceUrl || '',
    permalink: listing.permalink || '',
    image: source.rawData?.image || '',
    images: source.rawData?.images || [],
    suggestedPrice: Number(listing.price || 0),
    salePrice: Number(listing.price || 0),
    currency: listing.currency,
    stock: listing.stock,
    queuedAt: listing.publishedAt?.toISOString?.() || listing.lastSyncedAt?.toISOString?.() || '',
    updatedAt: listing.lastSyncedAt?.toISOString?.() || listing.publishedAt?.toISOString?.() || ''
  };
}

function listingData(workspaceId, integrationId, savedProductId, provider, product, status) {
  return {
    workspaceId,
    integrationId,
    savedProductId,
    provider,
    title: String(product.generatedTitle || product.title || 'Anuncio sem titulo').slice(0, 300),
    description: product.generatedDescription || product.description || '',
    price: Number(product.suggestedPrice || product.salePrice || product.price || 0),
    currency: product.currency || 'BRL',
    stock: Math.max(0, Math.round(Number(product.stock || product.availableQuantity || 1))),
    status,
    categoryId: product.categoryId || product.category || '',
    attributes: Array.isArray(product.attributes) ? product.attributes : []
  };
}

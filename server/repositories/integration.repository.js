export function createIntegrationRepository(prisma) {
  return {
    listForWorkspace(workspaceId) {
      return prisma.integration.findMany({
        where: { workspaceId },
        orderBy: { provider: 'asc' }
      });
    },

    findByWorkspaceAndProvider(workspaceId, provider) {
      return prisma.integration.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId,
            provider
          }
        }
      });
    },

    upsertOAuthConnection(workspaceId, provider, data) {
      return prisma.integration.upsert({
        where: {
          workspaceId_provider: {
            workspaceId,
            provider
          }
        },
        create: {
          workspaceId,
          provider,
          status: data.status,
          externalAccountId: data.externalAccountId,
          accountName: data.accountName,
          scopes: data.scopes,
          accessTokenEncrypted: data.accessTokenEncrypted,
          refreshTokenEncrypted: data.refreshTokenEncrypted,
          expiresAt: data.expiresAt,
          metadata: data.metadata
        },
        update: {
          status: data.status,
          externalAccountId: data.externalAccountId,
          accountName: data.accountName,
          scopes: data.scopes,
          accessTokenEncrypted: data.accessTokenEncrypted,
          refreshTokenEncrypted: data.refreshTokenEncrypted,
          expiresAt: data.expiresAt,
          metadata: data.metadata
        }
      });
    }
  };
}

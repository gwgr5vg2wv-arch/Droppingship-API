export function createSessionRepository(prisma) {
  return {
    create(data) {
      return prisma.userSession.create({ data });
    },
    findByRefreshTokenId(refreshTokenId) {
      return prisma.userSession.findUnique({ where: { refreshTokenId } });
    },
    findById(id) {
      return prisma.userSession.findUnique({ where: { id } });
    },
    rotate(id, data) {
      return prisma.userSession.update({ where: { id }, data: { ...data, lastUsedAt: new Date() } });
    },
    revoke(id, reason = 'revoked') {
      return prisma.userSession.update({
        where: { id },
        data: { revokedAt: new Date(), revokedReason: reason }
      });
    },
    revokeAllForUser(userId, reason = 'logout_all', exceptSessionId = null) {
      return prisma.userSession.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(exceptSessionId ? { id: { not: exceptSessionId } } : {})
        },
        data: { revokedAt: new Date(), revokedReason: reason }
      });
    },
    listActiveForUser(userId) {
      return prisma.userSession.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' }
      });
    }
  };
}

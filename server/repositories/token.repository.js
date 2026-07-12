export function createTokenRepository(prisma) {
  return {
    invalidatePasswordResetTokens(userId) {
      return prisma.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() }
      });
    },
    createPasswordReset(data) {
      return prisma.passwordResetToken.create({ data });
    },
    findPasswordReset(tokenHash) {
      return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    },
    usePasswordReset(id) {
      return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
    },
    invalidateEmailVerificationTokens(userId) {
      return prisma.emailVerificationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() }
      });
    },
    createEmailVerification(data) {
      return prisma.emailVerificationToken.create({ data });
    },
    findEmailVerification(tokenHash) {
      return prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    },
    useEmailVerification(id) {
      return prisma.emailVerificationToken.update({ where: { id }, data: { usedAt: new Date() } });
    }
  };
}

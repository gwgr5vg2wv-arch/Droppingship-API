export const userSelect = {
  id: true,
  name: true,
  email: true,
  passwordHash: true,
  role: true,
  status: true,
  avatarUrl: true,
  preferences: true,
  emailVerifiedAt: true,
  failedLoginCount: true,
  lockedUntil: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  deletedAt: true
};

export function createUserRepository(prisma) {
  return {
    findByEmail(email) {
      return prisma.user.findUnique({ where: { email }, select: userSelect });
    },
    findById(id) {
      return prisma.user.findUnique({ where: { id }, select: userSelect });
    },
    create(data) {
      return prisma.user.create({ data, select: userSelect });
    },
    update(id, data) {
      return prisma.user.update({ where: { id }, data, select: userSelect });
    },
    markLoginSuccess(id) {
      return prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
        select: userSelect
      });
    },
    markLoginFailure(id, failedLoginCount, lockedUntil = null) {
      return prisma.user.update({
        where: { id },
        data: { failedLoginCount, lockedUntil },
        select: userSelect
      });
    },
    softDelete(id) {
      return prisma.user.update({
        where: { id },
        data: { status: 'deleted', deletedAt: new Date() },
        select: userSelect
      });
    }
  };
}

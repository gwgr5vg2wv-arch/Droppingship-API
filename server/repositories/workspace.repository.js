export function createWorkspaceRepository(prisma) {
  return {
    createWorkspace(data) {
      return prisma.workspace.create({ data });
    },
    createMember(data) {
      return prisma.workspaceMember.create({ data });
    },
    listForUser(userId) {
      return prisma.workspace.findMany({
        where: {
          members: {
            some: { userId, status: 'active' }
          },
          status: 'active'
        },
        include: {
          members: {
            where: { userId },
            select: { id: true, role: true, permissions: true, status: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
    },
    findByIdForUser(workspaceId, userId) {
      return prisma.workspace.findFirst({
        where: {
          id: workspaceId,
          members: {
            some: { userId, status: 'active' }
          }
        },
        include: {
          members: {
            where: { userId },
            select: { id: true, role: true, permissions: true, status: true }
          }
        }
      });
    },
    update(workspaceId, data) {
      return prisma.workspace.update({ where: { id: workspaceId }, data });
    },
    listMembers(workspaceId) {
      return prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, status: true, emailVerifiedAt: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
    },
    findMember(memberId) {
      return prisma.workspaceMember.findUnique({ where: { id: memberId } });
    },
    updateMember(memberId, data) {
      return prisma.workspaceMember.update({ where: { id: memberId }, data });
    },
    deleteMember(memberId) {
      return prisma.workspaceMember.delete({ where: { id: memberId } });
    },
    countOwners(workspaceId) {
      return prisma.workspaceMember.count({ where: { workspaceId, role: 'owner', status: 'active' } });
    }
  };
}

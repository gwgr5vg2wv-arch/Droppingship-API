const blockedKeys = /password|token|secret|cookie|hash/i;

function sanitize(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !blockedKeys.test(key))
    .map(([key, item]) => [key, sanitize(item)]));
}

export function createAuditRepository(prisma) {
  return {
    create(data) {
      return prisma.auditLog.create({
        data: {
          workspaceId: data.workspaceId || null,
          userId: data.userId || null,
          action: data.action,
          entity: data.entity || 'system',
          entityId: data.entityId || null,
          before: sanitize(data.before) || undefined,
          after: sanitize(data.after) || undefined,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null
        }
      });
    }
  };
}

import { z } from 'zod';
import { getPrisma } from './database.service.js';
import { changePassword } from './auth.service.js';
import { createAuditRepository } from '../repositories/audit.repository.js';
import { createSessionRepository } from '../repositories/session.repository.js';
import { createUserRepository } from '../repositories/user.repository.js';
import { publicUser } from '../utils/token.util.js';

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  avatarUrl: z.string().url().max(500).optional().or(z.literal('')),
  preferences: z.record(z.unknown()).optional()
});

export async function getProfile(userId) {
  const user = await createUserRepository(getPrisma()).findById(userId);
  return publicUser(user);
}

export async function updateProfile(userId, input, context = {}) {
  const data = profileSchema.parse(input);
  const prisma = getPrisma();
  const user = await createUserRepository(prisma).update(userId, {
    ...('name' in data ? { name: data.name } : {}),
    ...('avatarUrl' in data ? { avatarUrl: data.avatarUrl || null } : {}),
    ...('preferences' in data ? { preferences: data.preferences || {} } : {})
  });
  await createAuditRepository(prisma).create({
    action: 'PROFILE_UPDATED',
    entity: 'User',
    entityId: userId,
    userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    after: publicUser(user)
  });
  return publicUser(user);
}

export async function changeProfilePassword(userId, input, context = {}) {
  return changePassword(userId, input, context);
}

export async function deleteProfile(userId, context = {}) {
  const prisma = getPrisma();
  const user = await createUserRepository(prisma).softDelete(userId);
  await createSessionRepository(prisma).revokeAllForUser(userId, 'account_deleted');
  await createAuditRepository(prisma).create({
    action: 'PROFILE_DELETED',
    entity: 'User',
    entityId: userId,
    userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  return publicUser(user);
}

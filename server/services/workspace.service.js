import { z } from 'zod';
import { getPrisma } from './database.service.js';
import { createAuditRepository } from '../repositories/audit.repository.js';
import { createWorkspaceRepository } from '../repositories/workspace.repository.js';
import { createUserRepository } from '../repositories/user.repository.js';
import { normalizeEmail } from '../utils/token.util.js';

const workspaceSchema = z.object({ name: z.string().trim().min(2).max(120) });
const inviteSchema = z.object({ email: z.string().email().transform(normalizeEmail), role: z.enum(['admin', 'operator', 'viewer']).default('viewer') });
const memberRoleSchema = z.object({ role: z.enum(['owner', 'admin', 'operator', 'viewer']), permissions: z.record(z.unknown()).optional() });

export async function listWorkspaces(userId) {
  return createWorkspaceRepository(getPrisma()).listForUser(userId);
}

export async function createWorkspace(userId, input, context = {}) {
  const data = workspaceSchema.parse(input);
  const prisma = getPrisma();
  const result = await prisma.$transaction(async (tx) => {
    const repo = createWorkspaceRepository(tx);
    const workspace = await repo.createWorkspace({ name: data.name, ownerId: userId, status: 'active' });
    await repo.createMember({ workspaceId: workspace.id, userId, role: 'owner', status: 'active', joinedAt: new Date(), permissions: { all: true } });
    await createAuditRepository(tx).create({
      action: 'WORKSPACE_CREATED',
      entity: 'Workspace',
      entityId: workspace.id,
      workspaceId: workspace.id,
      userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      after: { name: workspace.name }
    });
    return workspace;
  });
  return result;
}

export async function getWorkspace(userId, workspaceId) {
  const workspace = await createWorkspaceRepository(getPrisma()).findByIdForUser(workspaceId, userId);
  if (!workspace) throw forbidden();
  return workspace;
}

export async function updateWorkspace(userId, workspaceId, input, context = {}) {
  const data = workspaceSchema.parse(input);
  const prisma = getPrisma();
  const workspace = await createWorkspaceRepository(prisma).update(workspaceId, { name: data.name });
  await createAuditRepository(prisma).create({
    action: 'WORKSPACE_UPDATED',
    entity: 'Workspace',
    entityId: workspaceId,
    workspaceId,
    userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    after: { name: data.name }
  });
  return workspace;
}

export async function listMembers(workspaceId) {
  return createWorkspaceRepository(getPrisma()).listMembers(workspaceId);
}

export async function inviteMember(userId, workspaceId, input, context = {}) {
  const data = inviteSchema.parse(input);
  const prisma = getPrisma();
  const user = await createUserRepository(prisma).findByEmail(data.email);
  if (!user) {
    await createAuditRepository(prisma).create({
      action: 'MEMBER_INVITED',
      entity: 'WorkspaceMember',
      workspaceId,
      userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      after: { email: data.email, role: data.role, emailDelivery: 'not-configured' }
    });
    return { invited: false, email: data.email, role: data.role, message: 'Usuario ainda nao existe; convite por email pendente de provedor.' };
  }

  const member = await createWorkspaceRepository(prisma).createMember({
    workspaceId,
    userId: user.id,
    role: data.role,
    status: 'active',
    invitedEmail: data.email,
    invitedAt: new Date(),
    joinedAt: new Date(),
    permissions: rolePermissions(data.role)
  });
  await createAuditRepository(prisma).create({
    action: 'MEMBER_INVITED',
    entity: 'WorkspaceMember',
    entityId: member.id,
    workspaceId,
    userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    after: { invitedUserId: user.id, role: data.role }
  });
  return member;
}

export async function updateMember(userId, workspaceId, memberId, input, context = {}) {
  const data = memberRoleSchema.parse(input);
  const prisma = getPrisma();
  const repo = createWorkspaceRepository(prisma);
  const member = await repo.findMember(memberId);
  if (!member || member.workspaceId !== workspaceId) throw forbidden();
  if (member.role === 'owner' && data.role !== 'owner' && await repo.countOwners(workspaceId) <= 1) {
    const error = new Error('Nao e permitido remover o ultimo owner.');
    error.status = 409;
    throw error;
  }
  const updated = await repo.updateMember(memberId, { role: data.role, permissions: data.permissions || rolePermissions(data.role) });
  await createAuditRepository(prisma).create({
    action: 'MEMBER_ROLE_CHANGED',
    entity: 'WorkspaceMember',
    entityId: memberId,
    workspaceId,
    userId,
    before: { role: member.role },
    after: { role: data.role },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  return updated;
}

export async function removeMember(userId, workspaceId, memberId, context = {}) {
  const prisma = getPrisma();
  const repo = createWorkspaceRepository(prisma);
  const member = await repo.findMember(memberId);
  if (!member || member.workspaceId !== workspaceId) throw forbidden();
  if (member.role === 'owner' && await repo.countOwners(workspaceId) <= 1) {
    const error = new Error('Nao e permitido remover o ultimo owner.');
    error.status = 409;
    throw error;
  }
  await repo.deleteMember(memberId);
  await createAuditRepository(prisma).create({
    action: 'MEMBER_REMOVED',
    entity: 'WorkspaceMember',
    entityId: memberId,
    workspaceId,
    userId,
    before: { removedUserId: member.userId, role: member.role },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  return { ok: true };
}

function rolePermissions(role) {
  return {
    owner: { all: true },
    admin: { manageWorkspace: true, manageMembers: true, operate: true },
    operator: { operate: true },
    viewer: { read: true }
  }[role] || { read: true };
}

function forbidden() {
  const error = new Error('Acesso ao workspace negado.');
  error.status = 403;
  return error;
}

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getPrisma } from '../services/database.service.js';
import { createUserRepository } from '../repositories/user.repository.js';
import { createWorkspaceRepository } from '../repositories/workspace.repository.js';

const roleRank = { viewer: 1, operator: 2, admin: 3, owner: 4 };

export async function requireAuth(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: 'Sessao ausente ou expirada.' });
    const payload = jwt.verify(token, env.JWT_SECRET);
    const prisma = getPrisma();
    if (!prisma) return res.status(503).json({ error: 'Banco PostgreSQL nao configurado.' });
    const user = await createUserRepository(prisma).findById(payload.sub);
    if (!user || user.deletedAt || !['active', 'pending'].includes(user.status)) {
      return res.status(401).json({ error: 'Sessao ausente ou expirada.' });
    }
    req.auth = {
      user,
      userId: user.id,
      sessionId: payload.sid,
      workspaceId: payload.workspaceId || req.headers['x-workspace-id'] || null,
      role: payload.role || user.role
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Sessao ausente ou expirada.' });
  }
}

export async function requireWorkspace(req, res, next) {
  try {
    const workspaceId = req.params.workspaceId || req.body?.workspaceId || req.headers['x-workspace-id'] || req.auth?.workspaceId;
    if (!workspaceId) return res.status(400).json({ error: 'Workspace nao informado.' });
    const workspace = await createWorkspaceRepository(getPrisma()).findByIdForUser(workspaceId, req.auth.userId);
    if (!workspace) return res.status(403).json({ error: 'Acesso ao workspace negado.' });
    req.workspace = workspace;
    req.auth.workspaceId = workspace.id;
    req.auth.role = workspace.members?.[0]?.role || req.auth.role;
    req.auth.permissions = workspace.members?.[0]?.permissions || {};
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const current = req.auth?.role;
    const allowed = roles.some((role) => roleRank[current] >= roleRank[role]);
    if (!allowed) return res.status(403).json({ error: 'Permissao insuficiente.' });
    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const permissions = req.auth?.permissions || {};
    if (permissions.all || permissions[permission]) return next();
    return res.status(403).json({ error: 'Permissao insuficiente.' });
  };
}

function bearerToken(req) {
  const value = req.headers.authorization || '';
  if (value.startsWith('Bearer ')) return value.slice(7);
  return req.cookies?.ds_access || '';
}

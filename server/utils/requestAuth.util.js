import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getPrisma } from '../services/database.service.js';
import { createWorkspaceRepository } from '../repositories/workspace.repository.js';

export async function getOptionalWorkspaceContext(req) {
  const token = bearerToken(req);
  if (!token || !env.JWT_SECRET) return null;
  const prisma = getPrisma();
  if (!prisma) return null;

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }

  const workspaceId = req.headers['x-workspace-id'] || payload.workspaceId;
  if (!workspaceId) return null;
  const workspace = await createWorkspaceRepository(prisma).findByIdForUser(String(workspaceId), payload.sub);
  if (!workspace) return null;

  return {
    prisma,
    userId: payload.sub,
    workspaceId: workspace.id,
    workspace
  };
}

function bearerToken(req) {
  const value = req.headers.authorization || '';
  if (value.startsWith('Bearer ')) return value.slice(7);
  return req.cookies?.ds_access || '';
}

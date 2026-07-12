import { ZodError } from 'zod';
import {
  createWorkspace,
  getWorkspace,
  inviteMember,
  listMembers,
  listWorkspaces,
  removeMember,
  updateMember,
  updateWorkspace
} from '../services/workspace.service.js';

export async function index(req, res, next) {
  try {
    res.json({ workspaces: await listWorkspaces(req.auth.userId) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function create(req, res, next) {
  try {
    res.status(201).json({ workspace: await createWorkspace(req.auth.userId, req.body, requestContext(req)) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function show(req, res, next) {
  try {
    res.json({ workspace: await getWorkspace(req.auth.userId, req.params.workspaceId) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function patch(req, res, next) {
  try {
    res.json({ workspace: await updateWorkspace(req.auth.userId, req.params.workspaceId, req.body, requestContext(req)) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function members(req, res, next) {
  try {
    res.json({ members: await listMembers(req.params.workspaceId) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function invitations(req, res, next) {
  try {
    res.status(201).json({ invitation: await inviteMember(req.auth.userId, req.params.workspaceId, req.body, requestContext(req)) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function patchMember(req, res, next) {
  try {
    res.json({ member: await updateMember(req.auth.userId, req.params.workspaceId, req.params.memberId, req.body, requestContext(req)) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function deleteMember(req, res, next) {
  try {
    res.json(await removeMember(req.auth.userId, req.params.workspaceId, req.params.memberId, requestContext(req)));
  } catch (error) {
    handle(error, res, next);
  }
}

function requestContext(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] || '' };
}

function handle(error, res, next) {
  if (error instanceof ZodError) return res.status(400).json({ error: 'Dados invalidos.', issues: error.issues });
  if (error.status) return res.status(error.status).json({ error: error.message });
  next(error);
}

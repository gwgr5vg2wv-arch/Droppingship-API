import { ZodError } from 'zod';
import { changeProfilePassword, deleteProfile, getProfile, updateProfile } from '../services/user.service.js';

export async function me(req, res, next) {
  try {
    res.json({ user: await getProfile(req.auth.userId) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function patchMe(req, res, next) {
  try {
    res.json({ user: await updateProfile(req.auth.userId, req.body, requestContext(req)) });
  } catch (error) {
    handle(error, res, next);
  }
}

export async function patchPassword(req, res, next) {
  try {
    res.json(await changeProfilePassword(req.auth.userId, req.body, requestContext(req)));
  } catch (error) {
    handle(error, res, next);
  }
}

export async function deleteMe(req, res, next) {
  try {
    res.json({ user: await deleteProfile(req.auth.userId, requestContext(req)) });
  } catch (error) {
    handle(error, res, next);
  }
}

function requestContext(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] || '', currentSessionId: req.auth?.sessionId };
}

function handle(error, res, next) {
  if (error instanceof ZodError) return res.status(400).json({ error: 'Dados invalidos.', issues: error.issues });
  if (error.status) return res.status(error.status).json({ error: error.message });
  next(error);
}

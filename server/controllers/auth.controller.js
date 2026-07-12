import { ZodError } from 'zod';
import { env } from '../config/env.js';
import {
  authCookieOptions,
  getCurrentUserFromAccessToken,
  listSessions,
  loginUser,
  logoutAll,
  logoutSession,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resetPassword,
  revokeSession,
  sendVerification,
  verifyEmail
} from '../services/auth.service.js';

const refreshCookieName = env.COOKIE_NAME || 'ds_refresh';

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body, requestContext(req));
    setRefreshCookie(res, result.refreshToken);
    res.status(201).json(safeAuthResponse(result));
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body, requestContext(req));
    setRefreshCookie(res, result.refreshToken);
    res.json(safeAuthResponse(result));
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function refresh(req, res, next) {
  try {
    const result = await refreshSession(readRefreshCookie(req), requestContext(req));
    setRefreshCookie(res, result.refreshToken);
    res.json(safeAuthResponse(result));
  } catch (error) {
    clearRefreshCookie(res);
    handleAuthError(error, res, next);
  }
}

export async function me(req, res, next) {
  try {
    const user = await getCurrentUserFromAccessToken(bearerToken(req));
    if (!user) return res.status(401).json({ error: 'Sessao ausente ou expirada.' });
    res.json({ user });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function logout(req, res, next) {
  try {
    await logoutSession(readRefreshCookie(req), requestContext(req));
    clearRefreshCookie(res);
    res.clearCookie('ds_access', accessCookieOptions());
    res.json({ ok: true });
  } catch (error) {
    clearRefreshCookie(res);
    handleAuthError(error, res, next);
  }
}

export async function logoutEverywhere(req, res, next) {
  try {
    await logoutAll(req.auth.userId, requestContext(req));
    clearRefreshCookie(res);
    res.json({ ok: true });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function sessions(req, res, next) {
  try {
    res.json({ sessions: await listSessions(req.auth.userId) });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function deleteSession(req, res, next) {
  try {
    res.json(await revokeSession(req.auth.userId, req.params.sessionId, requestContext(req)));
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    res.json(await requestPasswordReset(req.body, requestContext(req)));
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function resetPasswordController(req, res, next) {
  try {
    res.json(await resetPassword(req.body, requestContext(req)));
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function sendEmailVerification(req, res, next) {
  try {
    res.json(await sendVerification(req.auth.userId, requestContext(req)));
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function verifyEmailController(req, res, next) {
  try {
    res.json(await verifyEmail(req.body, requestContext(req)));
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

function setRefreshCookie(res, token) {
  res.cookie(refreshCookieName, token, authCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(refreshCookieName, clearCookieOptions());
}

function safeAuthResponse(result) {
  return {
    user: result.user,
    workspace: result.workspace,
    accessToken: result.accessToken,
    expiresAt: result.expiresAt
  };
}

function bearerToken(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : req.cookies?.ds_access || '';
}

function readRefreshCookie(req) {
  return req.signedCookies?.[refreshCookieName] || req.cookies?.[refreshCookieName] || '';
}

function requestContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || '',
    currentSessionId: req.auth?.sessionId
  };
}

function accessCookieOptions() {
  return clearCookieOptions();
}

function clearCookieOptions() {
  const { maxAge, expires, ...options } = authCookieOptions();
  return options;
}

function handleAuthError(error, res, next) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Dados invalidos.', issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })) });
  }
  if (isDatabaseUnavailable(error)) {
    return res.status(503).json({ error: 'Banco PostgreSQL indisponivel. Inicie o PostgreSQL em localhost:5432 e execute as migrations antes de entrar.' });
  }
  if (error.status) return res.status(error.status).json({ error: error.message });
  next(error);
}

function isDatabaseUnavailable(error) {
  const message = error?.message || '';
  return error?.code === 'P1001' || /Can't reach database server|ECONNREFUSED|localhost:5432/i.test(message);
}

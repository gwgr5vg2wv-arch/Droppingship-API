import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getPrisma } from './database.service.js';
import { sendTransactionalEmail } from './email.service.js';
import { createAuditRepository } from '../repositories/audit.repository.js';
import { createSessionRepository } from '../repositories/session.repository.js';
import { createTokenRepository } from '../repositories/token.repository.js';
import { createUserRepository } from '../repositories/user.repository.js';
import { createWorkspaceRepository } from '../repositories/workspace.repository.js';
import { addDuration, hashToken, normalizeEmail, publicUser, randomToken } from '../utils/token.util.js';

const strongPassword = z.string()
  .min(10)
  .max(200)
  .regex(/[a-z]/, 'A senha precisa conter letra minuscula.')
  .regex(/[A-Z]/, 'A senha precisa conter letra maiuscula.')
  .regex(/[0-9]/, 'A senha precisa conter numero.');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180).transform(normalizeEmail),
  password: strongPassword,
  workspaceName: z.string().trim().min(2).max(120).optional()
});

const loginSchema = z.object({
  email: z.string().trim().email().max(180).transform(normalizeEmail),
  password: z.string().min(1).max(200)
});

const resetSchema = z.object({
  token: z.string().min(20),
  password: strongPassword
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPassword
});

export function requireAuthDependencies() {
  const missing = [];
  if (!getPrisma()) missing.push('DATABASE_URL');
  if (!env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (!env.SESSION_SECRET) missing.push('SESSION_SECRET');
  return missing;
}

export async function registerUser(input, context = {}) {
  assertAuthAvailable();
  const data = registerSchema.parse(input);
  const prisma = getPrisma();
  const users = createUserRepository(prisma);
  const existing = await users.findByEmail(data.email);
  if (existing && !existing.deletedAt) {
    const error = new Error('E-mail ja cadastrado.');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const refreshTokenId = randomToken(18);
  const refreshToken = signRefreshToken({ userId: 'pending', refreshTokenId });

  const result = await prisma.$transaction(async (tx) => {
    const txUsers = createUserRepository(tx);
    const txWorkspaces = createWorkspaceRepository(tx);
    const txSessions = createSessionRepository(tx);
    const txAudit = createAuditRepository(tx);

    const user = await txUsers.create({
      name: data.name,
      email: data.email,
      passwordHash,
      status: 'active',
      role: 'owner'
    });
    const workspace = await txWorkspaces.createWorkspace({
      name: data.workspaceName || `${data.name} Workspace`,
      ownerId: user.id,
      status: 'active'
    });
    await txWorkspaces.createMember({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
      permissions: { all: true }
    });

    const realRefreshTokenId = randomToken(18);
    const realRefreshToken = signRefreshToken({ userId: user.id, refreshTokenId: realRefreshTokenId });
    const session = await txSessions.create({
      userId: user.id,
      workspaceId: workspace.id,
      refreshTokenHash: hashToken(realRefreshToken),
      refreshTokenId: realRefreshTokenId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expiresAt: refreshExpiry()
    });

    await txAudit.create({
      action: 'REGISTER',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      workspaceId: workspace.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      after: { userId: user.id, workspaceId: workspace.id }
    });

    return { user: publicUser(user), workspace, session, refreshToken: realRefreshToken };
  });

  return withTokens(result.user, result.session, result.workspace, result.refreshToken || refreshToken);
}

export async function loginUser(input, context = {}) {
  assertAuthAvailable();
  const data = loginSchema.parse(input);
  const prisma = getPrisma();
  const users = createUserRepository(prisma);
  const user = await users.findByEmail(data.email);
  const genericError = invalidCredentials();

  if (!user || user.deletedAt) throw genericError;
  if (!['active', 'pending'].includes(user.status)) throw genericError;
  if (user.lockedUntil && user.lockedUntil > new Date()) throw genericError;

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    const nextFailures = (user.failedLoginCount || 0) + 1;
    const lockedUntil = nextFailures >= 5 ? new Date(Date.now() + 15 * 60_000) : null;
    await users.markLoginFailure(user.id, nextFailures, lockedUntil);
    await createAuditRepository(prisma).create({
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    throw genericError;
  }

  const workspaces = await createWorkspaceRepository(prisma).listForUser(user.id);
  const workspace = workspaces[0] || null;
  const refreshTokenId = randomToken(18);
  const refreshToken = signRefreshToken({ userId: user.id, refreshTokenId });

  const result = await prisma.$transaction(async (tx) => {
    const txUsers = createUserRepository(tx);
    const txSessions = createSessionRepository(tx);
    const txAudit = createAuditRepository(tx);
    const safeUser = await txUsers.markLoginSuccess(user.id);
    const session = await txSessions.create({
      userId: user.id,
      workspaceId: workspace?.id || null,
      refreshTokenHash: hashToken(refreshToken),
      refreshTokenId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expiresAt: refreshExpiry()
    });
    await txAudit.create({
      action: 'LOGIN_SUCCESS',
      entity: 'UserSession',
      entityId: session.id,
      userId: user.id,
      workspaceId: workspace?.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
    return { user: publicUser(safeUser), session };
  });

  return withTokens(result.user, result.session, workspace, refreshToken);
}

export async function refreshSession(refreshToken, context = {}) {
  assertAuthAvailable();
  if (!refreshToken) throw unauthorized('Refresh token ausente.');
  const payload = verifyRefreshToken(refreshToken);
  const prisma = getPrisma();
  const sessions = createSessionRepository(prisma);
  const session = await sessions.findByRefreshTokenId(payload.jti);
  if (!session) throw unauthorized('Sessao invalida.');

  if (session.revokedAt || session.expiresAt <= new Date() || session.refreshTokenHash !== hashToken(refreshToken)) {
    await sessions.revoke(session.id, 'refresh_reuse_detected').catch(() => null);
    throw unauthorized('Sessao expirada ou comprometida.');
  }

  const user = await createUserRepository(prisma).findById(session.userId);
  if (!user || user.deletedAt || !['active', 'pending'].includes(user.status)) throw unauthorized('Usuario indisponivel.');
  const workspace = session.workspaceId
    ? await createWorkspaceRepository(prisma).findByIdForUser(session.workspaceId, user.id)
    : null;
  const nextRefreshTokenId = randomToken(18);
  const nextRefreshToken = signRefreshToken({ userId: user.id, refreshTokenId: nextRefreshTokenId });
  const rotated = await sessions.rotate(session.id, {
    refreshTokenHash: hashToken(nextRefreshToken),
    refreshTokenId: nextRefreshTokenId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    expiresAt: refreshExpiry()
  });

  return withTokens(publicUser(user), rotated, workspace, nextRefreshToken);
}

export async function getCurrentUserFromAccessToken(accessToken) {
  assertAuthAvailable();
  if (!accessToken) return null;
  const payload = jwt.verify(accessToken, env.JWT_SECRET);
  const user = await createUserRepository(getPrisma()).findById(payload.sub);
  if (!user || user.deletedAt) return null;
  return publicUser(user);
}

export async function logoutSession(refreshToken, context = {}) {
  assertAuthAvailable();
  if (!refreshToken) return { ok: true };
  const prisma = getPrisma();
  const payload = verifyRefreshToken(refreshToken);
  const session = await createSessionRepository(prisma).findByRefreshTokenId(payload.jti);
  if (session && !session.revokedAt) {
    await createSessionRepository(prisma).revoke(session.id, 'logout');
    await createAuditRepository(prisma).create({
      action: 'LOGOUT',
      entity: 'UserSession',
      entityId: session.id,
      userId: session.userId,
      workspaceId: session.workspaceId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  }
  return { ok: true };
}

export async function logoutAll(userId, context = {}) {
  assertAuthAvailable();
  const prisma = getPrisma();
  await createSessionRepository(prisma).revokeAllForUser(userId, 'logout_all');
  await createAuditRepository(prisma).create({
    action: 'LOGOUT_ALL',
    entity: 'UserSession',
    userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  return { ok: true };
}

export async function listSessions(userId) {
  assertAuthAvailable();
  const sessions = await createSessionRepository(getPrisma()).listActiveForUser(userId);
  return sessions.map(({ refreshTokenHash, refreshTokenId, ...safe }) => safe);
}

export async function revokeSession(userId, sessionId, context = {}) {
  assertAuthAvailable();
  const prisma = getPrisma();
  const session = await createSessionRepository(prisma).findById(sessionId);
  if (!session || session.userId !== userId) throw notFound('Sessao nao encontrada.');
  await createSessionRepository(prisma).revoke(sessionId, 'revoked_by_user');
  await createAuditRepository(prisma).create({
    action: 'SESSION_REVOKED',
    entity: 'UserSession',
    entityId: sessionId,
    userId,
    workspaceId: session.workspaceId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  return { ok: true };
}

export async function requestPasswordReset(input, context = {}) {
  assertAuthAvailable();
  const email = normalizeEmail(z.object({ email: z.string().email() }).parse(input).email);
  const prisma = getPrisma();
  const user = await createUserRepository(prisma).findByEmail(email);
  if (!user || user.deletedAt) return { ok: true };
  const token = randomToken(32);
  const tokens = createTokenRepository(prisma);
  await tokens.invalidatePasswordResetTokens(user.id);
  await tokens.createPasswordReset({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) });
  await createAuditRepository(prisma).create({
    action: 'PASSWORD_RESET_REQUESTED',
    entity: 'User',
    entityId: user.id,
    userId: user.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  const resetUrl = `${env.FRONTEND_URL || env.APP_URL || ''}/Droppingship/bot.html#reset-password?token=${token}`;
  const emailResult = await sendTransactionalEmail({ to: user.email, subject: 'Redefinicao de senha Droppingship', text: resetUrl });
  return env.NODE_ENV === 'production' ? { ok: true, email: emailResult } : { ok: true, devToken: token, email: emailResult };
}

export async function resetPassword(input, context = {}) {
  assertAuthAvailable();
  const data = resetSchema.parse(input);
  const prisma = getPrisma();
  const tokens = createTokenRepository(prisma);
  const reset = await tokens.findPasswordReset(hashToken(data.token));
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) throw unauthorized('Token invalido ou expirado.');
  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.$transaction(async (tx) => {
    await createUserRepository(tx).update(reset.userId, { passwordHash, failedLoginCount: 0, lockedUntil: null });
    await createTokenRepository(tx).usePasswordReset(reset.id);
    await createSessionRepository(tx).revokeAllForUser(reset.userId, 'password_reset');
    await createAuditRepository(tx).create({
      action: 'PASSWORD_RESET_COMPLETED',
      entity: 'User',
      entityId: reset.userId,
      userId: reset.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  });
  return { ok: true };
}

export async function sendVerification(userId, context = {}) {
  assertAuthAvailable();
  const prisma = getPrisma();
  const user = await createUserRepository(prisma).findById(userId);
  if (!user || user.deletedAt) throw notFound('Usuario nao encontrado.');
  const token = randomToken(32);
  const tokens = createTokenRepository(prisma);
  await tokens.invalidateEmailVerificationTokens(user.id);
  await tokens.createEmailVerification({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60_000) });
  await createAuditRepository(prisma).create({
    action: 'EMAIL_VERIFICATION_REQUESTED',
    entity: 'User',
    entityId: user.id,
    userId: user.id,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
  const verifyUrl = `${env.FRONTEND_URL || env.APP_URL || ''}/Droppingship/bot.html#verify-email?token=${token}`;
  const emailResult = await sendTransactionalEmail({ to: user.email, subject: 'Verificacao de email Droppingship', text: verifyUrl });
  return env.NODE_ENV === 'production' ? { ok: true, email: emailResult } : { ok: true, devToken: token, email: emailResult };
}

export async function verifyEmail(input, context = {}) {
  assertAuthAvailable();
  const token = z.object({ token: z.string().min(20) }).parse(input).token;
  const prisma = getPrisma();
  const tokens = createTokenRepository(prisma);
  const verification = await tokens.findEmailVerification(hashToken(token));
  if (!verification || verification.usedAt || verification.expiresAt <= new Date()) throw unauthorized('Token invalido ou expirado.');
  await prisma.$transaction(async (tx) => {
    await createTokenRepository(tx).useEmailVerification(verification.id);
    await createUserRepository(tx).update(verification.userId, { emailVerifiedAt: new Date(), status: 'active' });
    await createAuditRepository(tx).create({
      action: 'EMAIL_VERIFIED',
      entity: 'User',
      entityId: verification.userId,
      userId: verification.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  });
  return { ok: true };
}

export async function changePassword(userId, input, context = {}) {
  assertAuthAvailable();
  const data = changePasswordSchema.parse(input);
  const prisma = getPrisma();
  const user = await createUserRepository(prisma).findById(userId);
  if (!user || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) throw invalidCredentials();
  await prisma.$transaction(async (tx) => {
    await createUserRepository(tx).update(userId, { passwordHash: await bcrypt.hash(data.newPassword, 12) });
    await createSessionRepository(tx).revokeAllForUser(userId, 'password_changed', context.currentSessionId);
    await createAuditRepository(tx).create({
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  });
  return { ok: true };
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    signed: Boolean(env.SESSION_SECRET),
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: 1000 * 60 * 60 * 24 * 30
  };
}

export function signAccessToken(user, session, workspace) {
  return jwt.sign({
    sub: user.id,
    sid: session.id,
    workspaceId: workspace?.id || session.workspaceId || null,
    role: workspace?.members?.[0]?.role || user.role
  }, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

function signRefreshToken({ userId, refreshTokenId }) {
  return jwt.sign({ sub: userId, jti: refreshTokenId, type: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (payload.type !== 'refresh') throw unauthorized('Refresh token invalido.');
  return payload;
}

function withTokens(user, session, workspace, refreshToken) {
  return {
    user,
    workspace,
    accessToken: signAccessToken(user, session, workspace),
    refreshToken,
    expiresAt: addDuration(env.JWT_ACCESS_EXPIRES_IN, 15 * 60_000)
  };
}

function refreshExpiry() {
  return addDuration(env.JWT_REFRESH_EXPIRES_IN, 30 * 86_400_000);
}

function assertAuthAvailable() {
  const missing = requireAuthDependencies();
  if (missing.length) {
    const error = new Error(`Modulo de autenticacao indisponivel. Variaveis ausentes: ${missing.join(', ')}.`);
    error.status = 503;
    throw error;
  }
}

function invalidCredentials() {
  const error = new Error('Credenciais invalidas.');
  error.status = 401;
  return error;
}

function unauthorized(message) {
  const error = new Error(message);
  error.status = 401;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

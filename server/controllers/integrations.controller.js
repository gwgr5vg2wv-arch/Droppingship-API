import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getMarketplaceClient } from '../services/marketplace.service.js';
import { readDb, writeDb } from '../services/mockData.service.js';
import { marketplaces, normalizeMarketplace, publicStatusFor, sanitizeError } from '../services/integrationMode.service.js';
import { getPrisma } from '../services/database.service.js';
import { createIntegrationRepository } from '../repositories/integration.repository.js';
import { createWorkspaceRepository } from '../repositories/workspace.repository.js';
import { encryptSecret, ensureEncryptionKey } from '../utils/crypto.util.js';

export async function integrationStatus(req, res, next) {
  try {
    const db = await readDb();
    const prismaIntegrations = await listAuthenticatedIntegrations(req).catch(() => []);
    res.json({
      mode: process.env.INTEGRATION_MODE || 'mock',
      integrations: marketplaces.map((marketplace) => mergePrismaStatus(
        publicStatusFor(marketplace, db.integrations?.[marketplace]),
        prismaIntegrations.find((item) => item.provider === marketplace)
      ))
    });
  } catch (error) {
    next(error);
  }
}

export async function oauthStart(req, res, next) {
  try {
    const marketplace = normalizeMarketplace(req.params.marketplace);
    if (!marketplace) return res.status(400).json({ error: 'Marketplace invalido.' });

    const client = getMarketplaceClient(marketplace);
    const state = ['mercadoLivre', 'aliexpress'].includes(marketplace) ? signOAuthState({
      marketplace,
      userId: req.auth.userId,
      workspaceId: req.auth.workspaceId
    }) : undefined;
    const authUrl = client.getAuthUrl({ state });
    res.json({ marketplace, authUrl, message: 'Abra esta URL para conectar sua conta oficial.' });
  } catch (error) {
    res.status(error.status || (error.code === 'NOT_CONNECTED' ? 400 : 500)).json({ error: sanitizeError(error) });
  }
}

export async function oauthCallback(req, res, next) {
  try {
    const marketplace = normalizeMarketplace(req.params.marketplace);
    if (!marketplace) return res.status(400).json({ error: 'Marketplace invalido.' });
    if (req.query.error) return res.status(400).json({ error: String(req.query.error_description || req.query.error) });
    if (!req.query.code) return res.status(400).json({ error: 'Codigo OAuth nao informado.' });

    if (marketplace === 'mercadoLivre') {
      return await mercadoLivreCallback(req, res, marketplace);
    }

    const client = getMarketplaceClient(marketplace);
    const token = await client.exchangeCodeForToken(req.query.code);
    const db = await readDb();
    db.integrations[marketplace] = {
      ...db.integrations[marketplace],
      status: 'conectado',
      connected: true,
      accessToken: token.access_token || token.accessToken || '',
      refreshToken: token.refresh_token || token.refreshToken || '',
      expiresAt: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : '',
      lastError: ''
    };
    await writeDb(db);
    res.json({ ok: true, marketplace, status: 'conectado' });
  } catch (error) {
    res.status(error.status || (error.code === 'NOT_CONNECTED' ? 400 : 500)).json({ error: sanitizeError(error) });
  }
}

async function mercadoLivreCallback(req, res, marketplace) {
  const state = verifyOAuthState(req.query.state, marketplace);
  const prisma = getPrisma();
  if (!prisma) return res.status(503).json({ error: 'Banco PostgreSQL nao configurado.' });
  ensureEncryptionKey();

  const client = getMarketplaceClient(marketplace);
  const token = await client.exchangeCodeForToken(req.query.code);
  if (!token.access_token) return res.status(502).json({ error: 'Mercado Livre nao retornou access_token.' });

  const account = await client.getCurrentUser(token.access_token);
  await createIntegrationRepository(prisma).upsertOAuthConnection(state.workspaceId, 'mercadoLivre', {
    status: 'connected',
    externalAccountId: account.id ? String(account.id) : '',
    accountName: account.nickname || account.first_name || '',
    scopes: parseScopes(token.scope),
    accessTokenEncrypted: encryptSecret(token.access_token),
    refreshTokenEncrypted: encryptSecret(token.refresh_token || ''),
    expiresAt: token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000) : null,
    metadata: {
      userId: state.userId,
      tokenType: token.token_type || 'bearer',
      siteId: account.site_id || 'MLB',
      connectedAt: new Date().toISOString()
    }
  });

  res.redirect(frontendRedirect(req, 'mercadoLivre', 'connected'));
}

async function listAuthenticatedIntegrations(req) {
  const token = bearerToken(req);
  const workspaceId = req.headers['x-workspace-id'];
  if (!token || !workspaceId || !env.JWT_SECRET) return [];
  const payload = jwt.verify(token, env.JWT_SECRET);
  const prisma = getPrisma();
  if (!prisma) return [];
  const workspace = await createWorkspaceRepository(prisma).findByIdForUser(String(workspaceId), payload.sub);
  if (!workspace) return [];
  return createIntegrationRepository(prisma).listForWorkspace(workspace.id);
}

function mergePrismaStatus(status, integration) {
  if (!integration) return status;
  return {
    ...status,
    status: integration.status || status.status,
    connected: integration.status === 'connected',
    accountConnected: integration.status === 'connected',
    accountName: integration.accountName || '',
    externalAccountId: integration.externalAccountId || '',
    expiresAt: integration.expiresAt?.toISOString?.() || '',
    lastError: integration.metadata?.lastError || status.lastError || ''
  };
}

function signOAuthState(payload) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    const error = new Error('JWT_SECRET deve ter pelo menos 32 caracteres para iniciar OAuth.');
    error.status = 503;
    throw error;
  }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '10m',
    issuer: 'droppingship-api',
    audience: `oauth:${payload.marketplace}`
  });
}

function verifyOAuthState(value, marketplace) {
  if (!value) {
    const error = new Error('State OAuth ausente.');
    error.status = 400;
    throw error;
  }
  try {
    return jwt.verify(String(value), env.JWT_SECRET, {
      issuer: 'droppingship-api',
      audience: `oauth:${marketplace}`
    });
  } catch {
    const error = new Error('State OAuth invalido ou expirado.');
    error.status = 400;
    throw error;
  }
}

function parseScopes(scope = '') {
  if (Array.isArray(scope)) return scope;
  return String(scope).split(/\s+/).filter(Boolean);
}

function bearerToken(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

function frontendRedirect(req, marketplace, status) {
  const path = req.originalUrl.startsWith('/drop/')
    ? '/drop/Droppingship/public/bot.html'
    : '/Droppingship/bot.html';
  const base = env.FRONTEND_URL || env.APP_URL || '';
  return `${base}${path}?integration=${encodeURIComponent(marketplace)}&status=${encodeURIComponent(status)}#integrations`;
}

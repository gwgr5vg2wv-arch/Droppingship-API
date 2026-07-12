import { getMarketplaceClient } from '../services/marketplace.service.js';
import { readDb, writeDb } from '../services/dataStore.service.js';
import { marketplaces, normalizeMarketplace, publicStatusFor, sanitizeError } from '../services/integrationMode.service.js';

export async function integrationStatus(req, res, next) {
  try {
    const db = await readDb();
    res.json({
      mode: 'real',
      integrations: marketplaces.map((marketplace) => publicStatusFor(marketplace, db.integrations?.[marketplace]))
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
    const authUrl = client.getAuthUrl();
    res.json({ marketplace, authUrl, message: 'Abra esta URL para conectar sua conta oficial.' });
  } catch (error) {
    res.status(error.code === 'NOT_CONNECTED' ? 400 : 500).json({ error: sanitizeError(error) });
  }
}

export async function oauthCallback(req, res, next) {
  try {
    const marketplace = normalizeMarketplace(req.params.marketplace);
    if (!marketplace) return res.status(400).json({ error: 'Marketplace invalido.' });
    if (!req.query.code) return res.status(400).json({ error: 'Codigo OAuth nao informado.' });

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
    res.status(error.code === 'NOT_CONNECTED' ? 400 : 500).json({ error: sanitizeError(error) });
  }
}


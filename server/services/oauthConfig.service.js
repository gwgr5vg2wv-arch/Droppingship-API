import axios from 'axios';
import { readDb, writeDb } from './dataStore.service.js';

const oauthDefinitions = {
  mercadoLivre: {
    required: true,
    env: ['MERCADO_LIVRE_CLIENT_ID', 'MERCADO_LIVRE_CLIENT_SECRET', 'MERCADO_LIVRE_REDIRECT_URI'],
    authBase: 'https://auth.mercadolivre.com.br/authorization',
    tokenUrl: 'https://api.mercadolibre.com/oauth/token'
  },
  shopee: {
    required: false,
    env: ['SHOPEE_PARTNER_ID', 'SHOPEE_PARTNER_KEY', 'SHOPEE_REDIRECT_URI']
  },
  aliexpress: {
    required: false,
    env: ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET', 'ALIEXPRESS_REDIRECT_URI']
  },
  temu: {
    required: false,
    env: ['TEMU_APP_KEY', 'TEMU_APP_SECRET', 'TEMU_REDIRECT_URI']
  },
  tiktokShop: {
    required: false,
    env: ['TIKTOK_SHOP_APP_KEY', 'TIKTOK_SHOP_APP_SECRET', 'TIKTOK_SHOP_REDIRECT_URI']
  }
};

export function getOAuthConfigStatus() {
  return Object.fromEntries(
    Object.entries(oauthDefinitions).map(([marketplace, config]) => [
      marketplace,
      {
        required: config.required,
        configured: config.env.every((envKey) => Boolean(process.env[envKey]))
      }
    ])
  );
}

export function getOAuthRedirectUri(marketplace) {
  return {
    mercadoLivre: process.env.MERCADO_LIVRE_REDIRECT_URI,
    shopee: process.env.SHOPEE_REDIRECT_URI,
    aliexpress: process.env.ALIEXPRESS_REDIRECT_URI,
    temu: process.env.TEMU_REDIRECT_URI,
    tiktokShop: process.env.TIKTOK_SHOP_REDIRECT_URI
  }[marketplace] || '';
}

export function isMarketplaceConfigured(marketplace) {
  const config = oauthDefinitions[marketplace];
  return config ? config.env.every((envKey) => Boolean(process.env[envKey])) : false;
}

export function getMercadoLivreAuthUrl() {
  if (!isMarketplaceConfigured('mercadoLivre')) {
    throw new Error('ConfiguraÃ§Ã£o do Mercado Livre ausente no servidor. Configure o .env.');
  }

  const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.MERCADO_LIVRE_CLIENT_ID,
    redirect_uri: redirectUri
  });

  return `${oauthDefinitions.mercadoLivre.authBase}?${params.toString()}`;
}

export async function refreshMercadoLivreToken(db) {
  const ml = db.integrations?.mercadoLivre;
  if (!ml?.connected || !ml?.refreshToken || !ml?.expiresAt) return db;

  const expiry = Number(ml.expiresAt) || 0;
  if (Date.now() + 1000 * 60 * 10 < expiry) {
    return db;
  }

  if (!process.env.MERCADO_LIVRE_CLIENT_ID || !process.env.MERCADO_LIVRE_CLIENT_SECRET) {
    return db;
  }

  try {
    const { data } = await axios.post(
      oauthDefinitions.mercadoLivre.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.MERCADO_LIVRE_CLIENT_ID,
        client_secret: process.env.MERCADO_LIVRE_CLIENT_SECRET,
        refresh_token: ml.refreshToken
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000 }
    );

    db.integrations.mercadoLivre = {
      ...ml,
      accessToken: data.access_token || ml.accessToken,
      refreshToken: data.refresh_token || ml.refreshToken,
      expiresAt: Date.now() + Number(data.expires_in || 0) * 1000,
      lastError: null
    };
    await writeDb(db);
    return db;
  } catch (error) {
    db.integrations.mercadoLivre = {
      ...ml,
      active: false,
      lastError: error.message || 'Falha ao renovar token do Mercado Livre'
    };
    await writeDb(db);
    return db;
  }
}

export async function checkMercadoLivreStatus(db) {
  const integration = db.integrations?.mercadoLivre || {};
  if (!integration.connected || !integration.accessToken) {
    return {
      active: false,
      sellerId: integration.sellerId || null,
      nickname: null,
      lastCheck: new Date().toISOString(),
      lastError: 'Conta Mercado Livre nÃ£o conectada.'
    };
  }

  try {
    const { data } = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${integration.accessToken}` },
      timeout: 10000
    });

    db.integrations.mercadoLivre = {
      ...integration,
      active: true,
      sellerId: data.id,
      nickname: data.nickname || null,
      lastCheck: new Date().toISOString(),
      lastError: null
    };
    await writeDb(db);
    return {
      active: true,
      sellerId: data.id,
      nickname: data.nickname || null,
      lastCheck: db.integrations.mercadoLivre.lastCheck,
      lastError: null
    };
  } catch (error) {
    db.integrations.mercadoLivre = {
      ...integration,
      active: false,
      lastCheck: new Date().toISOString(),
      lastError: error.response?.data?.message || error.message || 'Falha ao validar token Mercado Livre'
    };
    await writeDb(db);
    return {
      active: false,
      sellerId: integration.sellerId || null,
      nickname: integration.nickname || null,
      lastCheck: db.integrations.mercadoLivre.lastCheck,
      lastError: db.integrations.mercadoLivre.lastError
    };
  }
}


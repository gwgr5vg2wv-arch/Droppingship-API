import axios from 'axios';
import { readDb, writeDb } from './mockData.service.js';

const credentialKeys = [
  'OPENAI_API_KEY',
  'DEFAULT_MARKETPLACE_FEE_PERCENT',
  'INTEGRATION_MODE',
  'TRENDS_MODE',
  'MERCADO_LIVRE_CLIENT_ID',
  'MERCADO_LIVRE_CLIENT_SECRET',
  'MERCADO_LIVRE_REDIRECT_URI',
  'SHOPEE_PARTNER_ID',
  'SHOPEE_PARTNER_KEY',
  'SHOPEE_SHOP_ID',
  'SHOPEE_REDIRECT_URI',
  'TIKTOK_SHOP_APP_KEY',
  'TIKTOK_SHOP_APP_SECRET',
  'TIKTOK_SHOP_REDIRECT_URI',
  'ALIEXPRESS_APP_KEY',
  'ALIEXPRESS_APP_SECRET',
  'ALIEXPRESS_REDIRECT_URI',
  'TEMU_APP_KEY',
  'TEMU_APP_SECRET',
  'TEMU_REDIRECT_URI'
];

const marketplaceCredentialFields = {
  mercadoLivre: ['MERCADO_LIVRE_CLIENT_ID', 'MERCADO_LIVRE_CLIENT_SECRET', 'MERCADO_LIVRE_REDIRECT_URI'],
  shopee: ['SHOPEE_PARTNER_ID', 'SHOPEE_PARTNER_KEY', 'SHOPEE_SHOP_ID', 'SHOPEE_REDIRECT_URI'],
  tiktokShop: ['TIKTOK_SHOP_APP_KEY', 'TIKTOK_SHOP_APP_SECRET', 'TIKTOK_SHOP_REDIRECT_URI'],
  aliexpress: ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET'],
  temu: ['TEMU_APP_KEY', 'TEMU_APP_SECRET']
};

const secretKeys = new Set([
  'MERCADO_LIVRE_CLIENT_SECRET',
  'SHOPEE_PARTNER_KEY',
  'TIKTOK_SHOP_APP_SECRET',
  'ALIEXPRESS_APP_SECRET',
  'TEMU_APP_SECRET'
]);

const MASKED = '********';

function storedOrEnv(stored, key) {
  return stored[key] !== undefined && stored[key] !== null && stored[key] !== ''
    ? stored[key]
    : process.env[key] || '';
}

function maskValue(key, value) {
  if (!value) return '';
  return secretKeys.has(key) ? MASKED : value;
}

export async function initializeSystemCredentials() {
  const db = await readDb();
  const stored = db.systemCredentials || {};

  credentialKeys.forEach((key) => {
    if (!process.env[key] && stored[key] !== undefined && stored[key] !== null && stored[key] !== '') {
      process.env[key] = String(stored[key]);
    }
  });
}

export async function getSystemCredentials() {
  const db = await readDb();
  const stored = db.systemCredentials || {};

  return credentialKeys.reduce((acc, key) => {
    const value = storedOrEnv(stored, key);
    acc[key] = {
      value: maskValue(key, value),
      configured: Boolean(value)
    };
    return acc;
  }, {});
}

export async function saveSystemCredentials(values = {}) {
  const db = await readDb();
  db.systemCredentials = db.systemCredentials || {};

  credentialKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return;
    const newValue = values[key] || '';
    if (secretKeys.has(key) && newValue === '') return;
    if (newValue === MASKED) return;

    db.systemCredentials[key] = newValue;
    process.env[key] = String(newValue);
  });

  await writeDb(db);
  return getSystemCredentials();
}

export async function testMercadoLivreConnection() {
  const status = await getSetupStatus();
  const ml = status.mercadoLivre || {};
  const db = await readDb();
  const token = db.integrations?.mercadoLivre?.accessToken || process.env.MERCADO_LIVRE_ACCESS_TOKEN || '';
  if (!ml.configured) {
    const error = new Error('Credenciais Mercado Livre incompletas. Configure Client ID, Secret e Redirect URI.');
    error.status = 400;
    throw error;
  }

  if (!token) {
    return {
      ok: true,
      configured: true,
      connected: false,
      message: 'Credenciais configuradas. Agora clique em Conectar Mercado Livre para gerar token OAuth e liberar busca real autenticada.'
    };
  }

  const response = await axios.get('https://api.mercadolibre.com/sites/MLB/search', {
    params: { q: 'teste', limit: 1 },
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    timeout: 10000
  });
  return { ok: true, configured: true, connected: true, message: 'Mercado Livre respondeu com token OAuth.', raw: response.data };
}

export async function getSetupStatus() {
  const db = await readDb();
  const stored = db.systemCredentials || {};

  return Object.fromEntries(
    Object.entries(marketplaceCredentialFields).map(([marketplace, fields]) => [
      marketplace,
      {
        configured: fields.every((key) => Boolean(storedOrEnv(stored, key))),
        fields: Object.fromEntries(fields.map((key) => [key, Boolean(storedOrEnv(stored, key))]))
      }
    ])
  );
}

export const marketplaces = ['mercadoLivre', 'shopee', 'aliexpress', 'temu', 'tiktokShop'];

export const marketplaceLabels = {
  mercadoLivre: 'Mercado Livre',
  shopee: 'Shopee',
  aliexpress: 'AliExpress',
  temu: 'Temu',
  tiktokShop: 'TikTok Shop'
};

export function getIntegrationMode() {
  return normalizeMode(process.env.INTEGRATION_MODE, 'real');
}

export function getTrendsMode() {
  return normalizeMode(process.env.TRENDS_MODE, 'real');
}

export function normalizeMode(value, fallback = 'real') {
  return value === 'real' ? 'real' : fallback;
}

export function normalizeMarketplace(value) {
  return marketplaces.includes(value) ? value : null;
}

export function publicStatusFor(marketplace, integration = {}) {
  const connected = Boolean(integration.connected || integration.accessToken || process.env[envTokenName(marketplace)]);
  const configured = hasMarketplaceConfig(marketplace);
  const publicSearchActive = marketplace === 'mercadoLivre';

  return {
    marketplace,
    label: marketplaceLabels[marketplace],
    status: connected ? 'conectado' : 'nao-conectado',
    publicSearch: publicSearchActive ? 'ativa' : 'nao-conectada',
    accountConnected: connected,
    publishing: connected ? 'liberada' : 'bloqueada',
    connected,
    configured,
    lastSyncAt: integration.lastSyncAt || '',
    lastError: integration.lastError || '',
    mode: getIntegrationMode()
  };
}

export function sanitizeError(error) {
  return error?.publicMessage || error?.message || 'Falha na integracao oficial. Verifique credenciais e permissoes.';
}

export function missingConnectionError(marketplace) {
  const error = new Error(`${marketplaceLabels[marketplace]} nao conectado. Conecte sua conta nas Configuracoes.`);
  error.code = 'NOT_CONNECTED';
  error.publicMessage = error.message;
  return error;
}

export function hasMarketplaceConfig(marketplace) {
  const required = {
    mercadoLivre: ['MERCADO_LIVRE_CLIENT_ID', 'MERCADO_LIVRE_CLIENT_SECRET'],
    shopee: ['SHOPEE_PARTNER_ID', 'SHOPEE_PARTNER_KEY', 'SHOPEE_SHOP_ID'],
    aliexpress: ['ALIEXPRESS_APP_KEY', 'ALIEXPRESS_APP_SECRET'],
    temu: ['TEMU_APP_KEY', 'TEMU_APP_SECRET'],
    tiktokShop: ['TIKTOK_SHOP_APP_KEY', 'TIKTOK_SHOP_APP_SECRET']
  }[marketplace] || [];

  return required.every((key) => Boolean(process.env[key]));
}

export function getStoredToken(db, marketplace) {
  return db.integrations?.[marketplace]?.accessToken || process.env[envTokenName(marketplace)] || '';
}

function envTokenName(marketplace) {
  return {
    mercadoLivre: 'MERCADO_LIVRE_ACCESS_TOKEN',
    shopee: 'SHOPEE_ACCESS_TOKEN',
    aliexpress: 'ALIEXPRESS_ACCESS_TOKEN',
    temu: 'TEMU_ACCESS_TOKEN',
    tiktokShop: 'TIKTOK_SHOP_ACCESS_TOKEN'
  }[marketplace];
}

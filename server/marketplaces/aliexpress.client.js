import axios from 'axios';
import { missingConnectionError } from '../services/integrationMode.service.js';

const apiBase = 'https://api-sg.aliexpress.com/sync';
const oauthBase = 'https://oauth.aliexpress.com';

function requireConfig() {
  if (!process.env.ALIEXPRESS_APP_KEY || !process.env.ALIEXPRESS_APP_SECRET) throw missingConnectionError('aliexpress');
}

export default {
  async publicSearch(query) {
    if (!process.env.ALIEXPRESS_APP_KEY || !process.env.ALIEXPRESS_APP_SECRET) {
      const error = new Error('Busca publica AliExpress/Affiliate depende de app aprovado.');
      error.publicMessage = 'Fonte publica indisponivel';
      throw error;
    }
    return this.searchProducts(query);
  },

  getAuthUrl({ state } = {}) {
    requireConfig();
    const redirectUri = process.env.ALIEXPRESS_REDIRECT_URI || 'http://localhost:3000/Droppingship/api/integrations/oauth/aliexpress/callback';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.ALIEXPRESS_APP_KEY,
      redirect_uri: redirectUri
    });
    if (state) params.set('state', state);
    return `https://api-sg.aliexpress.com/oauth/authorize?${params.toString()}`;
  },

  async exchangeCodeForToken(code) {
    requireConfig();
    const redirectUri = process.env.ALIEXPRESS_REDIRECT_URI || 'http://localhost:3000/Droppingship/api/integrations/oauth/aliexpress/callback';
    const { data } = await axios.post(`${oauthBase}/token`, new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: process.env.ALIEXPRESS_APP_KEY,
      client_secret: process.env.ALIEXPRESS_APP_SECRET,
      redirect_uri: redirectUri,
      sp: 'ae'
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });
    return normalizeTokenResponse(data);
  },

  async searchProducts(query) {
    requireConfig();
    const { data } = await axios.get(apiBase, {
      params: {
        app_key: process.env.ALIEXPRESS_APP_KEY,
        method: 'aliexpress.affiliate.product.query',
        keywords: query
      }
    });
    return { products: data?.resp_result?.result?.products || [], raw: data };
  },

  async getProductDetail(productId) {
    requireConfig();
    const { data } = await axios.get(apiBase, {
      params: {
        app_key: process.env.ALIEXPRESS_APP_KEY,
        method: 'aliexpress.affiliate.productdetail.get',
        product_ids: productId
      }
    });
    return data;
  },

  async createAffiliateLink(product) {
    requireConfig();
    return { affiliateUrl: product.productUrl || product.url || '', product };
  },

  async publishProduct() {
    throw new Error('AliExpress esta preparado para afiliados/busca; publicacao direta depende de permissao oficial.');
  },

  async getOrders() {
    return { orders: [], notice: 'Pedidos AliExpress dependem do escopo oficial aprovado.' };
  },

  async syncOrders() {
    return this.getOrders();
  },

  async checkConnection() {
    requireConfig();
    return { connected: true };
  }
};

function normalizeTokenResponse(data = {}) {
  const payload = data.result || data.data || data.access_token_result || data;
  const accessToken = payload.access_token ||
    payload.accessToken ||
    payload.accessTokenValue ||
    payload.access_token_value ||
    payload.access_token_result?.access_token;
  if (!accessToken) {
    const providerCode = payload.error ||
      payload.error_code ||
      payload.code ||
      data.error ||
      data.error_code ||
      data.code ||
      'NO_ACCESS_TOKEN';
    const providerMessage = payload.error_description ||
      payload.error_message ||
      payload.message ||
      payload.msg ||
      data.error_description ||
      data.error_message ||
      data.message ||
      data.msg ||
      'AliExpress nao retornou access_token.';
    const error = new Error(`${providerCode}: ${providerMessage}`);
    error.status = 502;
    error.publicMessage = `AliExpress recusou o token OAuth (${providerCode}). ${providerMessage}`;
    error.responseData = sanitizeTokenResponse(data);
    console.warn('[ALIEXPRESS_OAUTH] token exchange sem access_token', error.responseData);
    throw error;
  }

  return {
    ...payload,
    access_token: accessToken,
    refresh_token: payload.refresh_token || payload.refreshToken || '',
    expires_in: payload.expires_in || payload.expiresIn || null,
    expire_time: payload.expire_time || payload.expireTime || null,
    user_nick: payload.user_nick || payload.userNick || payload.account || '',
    user_id: payload.user_id || payload.userId || payload.seller_id || payload.sellerId || ''
  };
}

function sanitizeTokenResponse(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeTokenResponse);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => (
    /token|secret|password/i.test(key) ? [key, '[redacted]'] : [key, sanitizeTokenResponse(item)]
  )));
}


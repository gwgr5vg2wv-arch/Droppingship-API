import axios from 'axios';
import { missingConnectionError } from '../services/integrationMode.service.js';

const apiBase = 'https://api-sg.aliexpress.com/sync';
const authBase = 'https://api-sg.aliexpress.com';

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
    const { data } = await axios.post(`${authBase}/auth/token/create`, {
      app_key: process.env.ALIEXPRESS_APP_KEY,
      app_secret: process.env.ALIEXPRESS_APP_SECRET,
      code
    }, {
      headers: { 'Content-Type': 'application/json' },
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
  const payload = data.result || data.data || data;
  const accessToken = payload.access_token || payload.accessToken || payload.accessTokenValue;
  if (!accessToken) {
    const error = new Error(payload.error_message || payload.message || 'AliExpress nao retornou access_token.');
    error.status = 502;
    error.responseData = data;
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


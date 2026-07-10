import axios from 'axios';
import { getStoredToken, missingConnectionError } from '../services/integrationMode.service.js';

const authBase = 'https://services.tiktokshop.com/open/authorize';
const apiBase = 'https://open-api.tiktokglobalshop.com';

export default {
  async publicSearch() {
    const error = new Error('Busca publica TikTok Shop bloqueada ou sem endpoint oficial publico estavel.');
    error.publicMessage = 'Busca publica bloqueada';
    throw error;
  },

  getAuthUrl() {
    if (!process.env.TIKTOK_SHOP_APP_KEY) throw missingConnectionError('tiktokShop');
    const redirectUri = process.env.TIKTOK_SHOP_REDIRECT_URI || 'http://localhost:3000/Droppingship/api/integrations/oauth/tiktokShop/callback';
    const params = new URLSearchParams({
      app_key: process.env.TIKTOK_SHOP_APP_KEY,
      response_type: 'code',
      redirect_uri: redirectUri
    });
    return `${authBase}?${params.toString()}`;
  },

  async exchangeCodeForToken(code) {
    if (!process.env.TIKTOK_SHOP_APP_KEY || !process.env.TIKTOK_SHOP_APP_SECRET) throw missingConnectionError('tiktokShop');
    const { data } = await axios.get(`${apiBase}/api/v2/token/get`, {
      params: {
        app_key: process.env.TIKTOK_SHOP_APP_KEY,
        app_secret: process.env.TIKTOK_SHOP_APP_SECRET,
        auth_code: code,
        grant_type: 'authorized_code'
      }
    });
    return data.data || data;
  },

  async searchProducts(query, context = {}) {
    const token = getStoredToken(context.db, 'tiktokShop');
    if (!token) throw missingConnectionError('tiktokShop');
    const { data } = await axios.post(`${apiBase}/product/202309/products/search`, { keyword: query }, {
      headers: { 'x-tts-access-token': token }
    });
    return { products: data.data?.products || [], raw: data };
  },

  async publishProduct(product, context = {}) {
    const token = getStoredToken(context.db, 'tiktokShop');
    if (!token) throw missingConnectionError('tiktokShop');
    const { data } = await axios.post(`${apiBase}/product/202309/products`, product, {
      headers: { 'x-tts-access-token': token }
    });
    return { externalId: data.data?.product_id, raw: data };
  },

  async getOrders(context = {}) {
    const token = getStoredToken(context.db, 'tiktokShop');
    if (!token) throw missingConnectionError('tiktokShop');
    const { data } = await axios.post(`${apiBase}/order/202309/orders/search`, {}, {
      headers: { 'x-tts-access-token': token }
    });
    return { orders: data.data?.orders || [], raw: data };
  },

  async syncOrders(context = {}) {
    return this.getOrders(context);
  },

  async checkConnection(context = {}) {
    const token = getStoredToken(context.db, 'tiktokShop');
    if (!token) throw missingConnectionError('tiktokShop');
    return { connected: true };
  }
};

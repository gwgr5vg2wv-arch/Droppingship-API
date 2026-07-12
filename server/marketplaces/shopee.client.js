import axios from 'axios';
import crypto from 'crypto';
import { getStoredToken, missingConnectionError } from '../services/integrationMode.service.js';

const apiBase = 'https://partner.shopeemobile.com';

function sign(path, timestamp, accessToken = '', shopId = '') {
  const base = `${process.env.SHOPEE_PARTNER_ID || ''}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', process.env.SHOPEE_PARTNER_KEY || '').update(base).digest('hex');
}

function requireConfig() {
  if (!process.env.SHOPEE_PARTNER_ID || !process.env.SHOPEE_PARTNER_KEY || !process.env.SHOPEE_SHOP_ID) {
    throw missingConnectionError('shopee');
  }
}

export default {
  async publicSearch() {
    const error = new Error('Busca publica Shopee bloqueada ou sem endpoint oficial publico estavel.');
    error.publicMessage = 'Fonte publica indisponivel';
    throw error;
  },

  getAuthUrl() {
    requireConfig();
    const redirect = process.env.SHOPEE_REDIRECT_URI || 'http://localhost:3000/Droppingship/api/integrations/oauth/shopee/callback';
    const path = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
      partner_id: process.env.SHOPEE_PARTNER_ID,
      timestamp: String(timestamp),
      sign: sign(path, timestamp),
      redirect
    });
    return `${apiBase}${path}?${params.toString()}`;
  },

  async exchangeCodeForToken(code) {
    requireConfig();
    const path = '/api/v2/auth/token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const { data } = await axios.post(`${apiBase}${path}`, {
      code,
      shop_id: Number(process.env.SHOPEE_SHOP_ID),
      partner_id: Number(process.env.SHOPEE_PARTNER_ID)
    }, { params: { partner_id: process.env.SHOPEE_PARTNER_ID, timestamp, sign: sign(path, timestamp) } });
    return data;
  },

  async searchProducts(query, context = {}) {
    const token = getStoredToken(context.db, 'shopee');
    if (!token) throw missingConnectionError('shopee');
    const path = '/api/v2/product/search_item';
    const timestamp = Math.floor(Date.now() / 1000);
    const { data } = await axios.get(`${apiBase}${path}`, {
      params: {
        partner_id: process.env.SHOPEE_PARTNER_ID,
        shop_id: process.env.SHOPEE_SHOP_ID,
        access_token: token,
        timestamp,
        sign: sign(path, timestamp, token, process.env.SHOPEE_SHOP_ID),
        item_name: query
      }
    });
    return { products: data.response?.item_list || [], raw: data };
  },

  async publishProduct(product, context = {}) {
    const token = getStoredToken(context.db, 'shopee');
    if (!token) throw missingConnectionError('shopee');
    const path = '/api/v2/product/add_item';
    const timestamp = Math.floor(Date.now() / 1000);
    const { data } = await axios.post(`${apiBase}${path}`, product, {
      params: {
        partner_id: process.env.SHOPEE_PARTNER_ID,
        shop_id: process.env.SHOPEE_SHOP_ID,
        access_token: token,
        timestamp,
        sign: sign(path, timestamp, token, process.env.SHOPEE_SHOP_ID)
      }
    });
    return { externalId: data.response?.item_id, raw: data };
  },

  async getOrders(context = {}) {
    const token = getStoredToken(context.db, 'shopee');
    if (!token) throw missingConnectionError('shopee');
    const path = '/api/v2/order/get_order_list';
    const timestamp = Math.floor(Date.now() / 1000);
    const { data } = await axios.get(`${apiBase}${path}`, {
      params: {
        partner_id: process.env.SHOPEE_PARTNER_ID,
        shop_id: process.env.SHOPEE_SHOP_ID,
        access_token: token,
        timestamp,
        sign: sign(path, timestamp, token, process.env.SHOPEE_SHOP_ID)
      }
    });
    return { orders: data.response?.order_list || [], raw: data };
  },

  async syncOrders(context = {}) {
    return this.getOrders(context);
  },

  async checkConnection(context = {}) {
    const token = getStoredToken(context.db, 'shopee');
    if (!token) throw missingConnectionError('shopee');
    return { connected: true, shopId: process.env.SHOPEE_SHOP_ID };
  }
};


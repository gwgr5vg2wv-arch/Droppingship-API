import axios from 'axios';
import { missingConnectionError } from '../services/integrationMode.service.js';

const apiBase = 'https://openapi.temu.com/openapi/router';

function requireConfig() {
  if (!process.env.TEMU_APP_KEY || !process.env.TEMU_APP_SECRET) throw missingConnectionError('temu');
}

export default {
  async publicSearch() {
    const error = new Error('Busca publica Temu bloqueada ou dependente de aprovacao partner.');
    error.publicMessage = 'Fonte publica indisponivel';
    throw error;
  },

  getAuthUrl() {
    requireConfig();
    return 'https://openapi.temu.com/oauth/authorize';
  },

  async exchangeCodeForToken(code) {
    requireConfig();
    return { code, notice: 'Temu OAuth preparado. Ajuste conforme conta partner aprovada.' };
  },

  async searchProducts(query) {
    requireConfig();
    const { data } = await axios.post(apiBase, {
      type: 'product.search',
      app_key: process.env.TEMU_APP_KEY,
      keyword: query
    });
    return { products: data.result?.products || [], raw: data };
  },

  async getProductDetail(productId) {
    requireConfig();
    const { data } = await axios.post(apiBase, {
      type: 'product.detail',
      app_key: process.env.TEMU_APP_KEY,
      product_id: productId
    });
    return data;
  },

  async publishProduct() {
    throw new Error('Temu esta preparado para integracao partner; publicacao depende de permissao oficial.');
  },

  async getOrders() {
    return { orders: [], notice: 'Pedidos Temu dependem de acesso partner oficial.' };
  },

  async syncOrders() {
    return this.getOrders();
  },

  async checkConnection() {
    requireConfig();
    return { connected: true };
  }
};


import axios from 'axios';
import { getStoredToken, missingConnectionError } from '../services/integrationMode.service.js';

const authBase = 'https://auth.mercadolivre.com.br/authorization';
const apiBase = 'https://api.mercadolibre.com';

export default {
  async publicSearch(query, context = {}) {
    const token = getStoredToken(context.db, 'mercadoLivre');
    if (token) return this.searchProducts(query, context);

    const { data } = await axios.get(`${apiBase}/sites/MLB/search`, {
      params: { q: query, limit: 20 },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DroppingshipSaaS/1.0 (+http://localhost:8080/Droppingship/bot.html)'
      },
      timeout: 8000,
      validateStatus: (status) => status < 400
    }).catch((error) => {
      throw marketplaceHttpError(error);
    });
    return { products: data.results || [], raw: data, mode: 'public' };
  },

  getAuthUrl() {
    if (!process.env.MERCADO_LIVRE_CLIENT_ID) throw missingConnectionError('mercadoLivre');
    const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI || 'http://localhost:3000/Droppingship/api/integrations/oauth/mercadoLivre/callback';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.MERCADO_LIVRE_CLIENT_ID,
      redirect_uri: redirectUri
    });
    return `${authBase}?${params.toString()}`;
  },

  async exchangeCodeForToken(code) {
    if (!process.env.MERCADO_LIVRE_CLIENT_ID || !process.env.MERCADO_LIVRE_CLIENT_SECRET) {
      throw missingConnectionError('mercadoLivre');
    }
    const redirectUri = process.env.MERCADO_LIVRE_REDIRECT_URI || 'http://localhost:3000/Droppingship/api/integrations/oauth/mercadoLivre/callback';
    const { data } = await axios.post(`${apiBase}/oauth/token`, new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.MERCADO_LIVRE_CLIENT_ID,
      client_secret: process.env.MERCADO_LIVRE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return data;
  },

  async refreshToken(refreshToken) {
    if (!refreshToken) throw missingConnectionError('mercadoLivre');
    const { data } = await axios.post(`${apiBase}/oauth/token`, new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.MERCADO_LIVRE_CLIENT_ID,
      client_secret: process.env.MERCADO_LIVRE_CLIENT_SECRET,
      refresh_token: refreshToken
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return data;
  },

  async searchProducts(query, context = {}) {
    const token = getStoredToken(context.db, 'mercadoLivre');
    if (!token) throw missingConnectionError('mercadoLivre');
    const { data } = await axios.get(`${apiBase}/sites/MLB/search`, {
      params: { q: query, limit: 10 },
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      timeout: 8000,
      validateStatus: (status) => status < 400
    }).catch((error) => {
      throw marketplaceHttpError(error);
    });
    return { products: data.results || [], raw: data, mode: 'real' };
  },

  async publishProduct(product, context = {}) {
    const token = getStoredToken(context.db, 'mercadoLivre');
    if (!token) throw missingConnectionError('mercadoLivre');
    const { data } = await axios.post(`${apiBase}/items`, product, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    }).catch((error) => {
      throw marketplaceHttpError(error);
    });
    return { externalId: data.id, raw: data };
  },

  async getOrders(context = {}) {
    const token = getStoredToken(context.db, 'mercadoLivre');
    if (!token) throw missingConnectionError('mercadoLivre');
    const { data } = await axios.get(`${apiBase}/orders/search`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    }).catch((error) => {
      throw marketplaceHttpError(error);
    });
    return { orders: data.results || [], raw: data };
  },

  async syncOrders(context = {}) {
    return this.getOrders(context);
  },

  async checkConnection(context = {}) {
    const token = getStoredToken(context.db, 'mercadoLivre');
    if (!token) throw missingConnectionError('mercadoLivre');
    const { data } = await axios.get(`${apiBase}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000
    }).catch((error) => {
      throw marketplaceHttpError(error);
    });
    return { connected: true, account: { id: data.id, nickname: data.nickname } };
  }
};

function marketplaceHttpError(error) {
  const status = error?.response?.status;
  const mapped = new Error('Integracao oficial indisponivel.');
  mapped.status = status;
  mapped.code = error?.code;
  mapped.publicMessage = {
    401: 'Autenticacao necessaria.',
    403: 'Busca publica indisponivel.',
    404: 'Recurso oficial nao encontrado.',
    429: 'Limite temporario da API oficial.',
    500: 'API oficial indisponivel.'
  }[status] || 'Integracao oficial indisponivel.';
  return mapped;
}

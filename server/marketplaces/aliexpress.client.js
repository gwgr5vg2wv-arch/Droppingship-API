import axios from 'axios';
import { missingConnectionError } from '../services/integrationMode.service.js';

const apiBase = 'https://api-sg.aliexpress.com/sync';

function requireConfig() {
  if (!process.env.ALIEXPRESS_APP_KEY || !process.env.ALIEXPRESS_APP_SECRET) throw missingConnectionError('aliexpress');
}

export default {
  async publicSearch(query) {
    if (!process.env.ALIEXPRESS_APP_KEY || !process.env.ALIEXPRESS_APP_SECRET) {
      const error = new Error('Busca publica AliExpress/Affiliate depende de app aprovado.');
      error.publicMessage = 'Busca publica bloqueada';
      throw error;
    }
    return this.searchProducts(query);
  },

  getAuthUrl() {
    requireConfig();
    return 'https://api-sg.aliexpress.com/oauth/authorize';
  },

  async exchangeCodeForToken(code) {
    requireConfig();
    return { code, notice: 'AliExpress OAuth preparado. Ajuste conforme app aprovado na Open Platform.' };
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

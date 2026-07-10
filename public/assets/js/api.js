const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const API_BASE = isLocal
  ? 'http://localhost:3000/Droppingship/api'
  : 'https://sstbet.onrender.com/Droppingship/api';

window.API_BASE = API_BASE;

async function apiFetch(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erro ao conversar com a API.');
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Não foi possível conectar à API do servidor.');
    }
    throw error;
  }
}

window.DroppingshipApi = {
  health: () => apiFetch('/health'),
  dashboard: () => apiFetch('/dashboard/summary'),
  trends: () => apiFetch('/trends'),
  integrations: () => apiFetch('/integrations/status'),
  startOAuth: (marketplace) => apiFetch(`/integrations/oauth/${marketplace}/start`),
  scan: (payload) => apiFetch('/bot/scan', { method: 'POST', body: JSON.stringify(payload) }),
  publicSearch: (payload) => apiFetch('/products/public-search', { method: 'POST', body: JSON.stringify(payload) }),
  searchReal: (payload) => apiFetch('/products/search-real', { method: 'POST', body: JSON.stringify(payload) }),
  products: () => apiFetch('/products'),
  saveProduct: (product) => apiFetch('/products/save', { method: 'POST', body: JSON.stringify({ product }) }),
  addToQueue: (product) => apiFetch('/products/publish-queue', { method: 'POST', body: JSON.stringify({ product }) }),
  simulatePublication: (id) => apiFetch('/products/publish-queue/simulate', { method: 'POST', body: JSON.stringify({ id }) }),
  publishProduct: (marketplace, product) => apiFetch('/products/publish', { method: 'POST', body: JSON.stringify({ marketplace, product }) }),
  orders: () => apiFetch('/orders'),
  syncOrders: () => apiFetch('/orders/sync'),
  finance: () => apiFetch('/finance/summary'),
  settings: () => apiFetch('/settings'),
  saveSettings: (settings) => apiFetch('/settings', { method: 'POST', body: JSON.stringify(settings) }),
  systemCredentials: () => apiFetch('/system-credentials'),
  saveSystemCredentials: (credentials) => apiFetch('/system-credentials', { method: 'POST', body: JSON.stringify(credentials) }),
  setupStatus: () => apiFetch('/system-credentials/status'),
  testMercadoLivrePublicApi: () => apiFetch('/system-credentials/test/mercadolivre')
};

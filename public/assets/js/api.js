const isLocal =
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1';

const API_BASE = isLocal
  ? 'http://localhost:3000/Droppingship/api'
  : 'https://sstbet.onrender.com/Droppingship/api';

window.API_BASE = API_BASE;
let accessToken = '';
let refreshing = null;

async function apiFetch(path, options = {}) {
  try {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetch(`${API_BASE}${path}`, {
      headers,
      credentials: 'include',
      ...options
    });

    if (!response.ok) {
      if (response.status === 401 && !options.skipAuthRefresh && path !== '/auth/refresh') {
        await refreshAuth();
        return apiFetch(path, { ...options, skipAuthRefresh: true });
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erro ao conversar com a API.');
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('API Node nao esta rodando. Abra outro terminal e execute npm run dev.');
    }
    throw error;
  }
}

async function refreshAuth() {
  if (!refreshing) {
    refreshing = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Sessao expirada.');
        const data = await response.json();
        accessToken = data.accessToken || '';
        window.dispatchEvent(new CustomEvent('droppingship:auth', { detail: data }));
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

window.DroppingshipApi = {
  request: apiFetch,
  setAccessToken: (token) => {
    accessToken = token || '';
  },
  refreshAuth,
  auth: {
    register: (payload) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    refresh: refreshAuth,
    me: () => apiFetch('/auth/me'),
    logout: () => apiFetch('/auth/logout', { method: 'POST' }),
    logoutAll: () => apiFetch('/auth/logout-all', { method: 'POST' }),
    sessions: () => apiFetch('/auth/sessions'),
    deleteSession: (id) => apiFetch(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    forgotPassword: (payload) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
    resetPassword: (payload) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
    sendVerification: () => apiFetch('/auth/send-verification', { method: 'POST' }),
    verifyEmail: (payload) => apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify(payload) })
  },
  users: {
    me: () => apiFetch('/users/me'),
    updateMe: (payload) => apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),
    changePassword: (payload) => apiFetch('/users/me/password', { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteMe: () => apiFetch('/users/me', { method: 'DELETE' })
  },
  workspaces: {
    list: () => apiFetch('/workspaces'),
    create: (payload) => apiFetch('/workspaces', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => apiFetch(`/workspaces/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    members: (id) => apiFetch(`/workspaces/${encodeURIComponent(id)}/members`),
    invite: (id, payload) => apiFetch(`/workspaces/${encodeURIComponent(id)}/invitations`, { method: 'POST', body: JSON.stringify(payload) }),
    deleteMember: (workspaceId, memberId) => apiFetch(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' })
  },
  health: () => apiFetch('/health'),
  dashboard: () => apiFetch('/dashboard/summary'),
  trends: () => apiFetch('/trends'),
  searchProducts: (query, filters = {}, options = {}) => {
    const params = new URLSearchParams({
      q: query,
      page: String(filters.page || 1),
      limit: String(filters.limit || 20)
    });
    if (filters.category) params.set('category', filters.category);
    if (filters.refresh) params.set('refresh', 'true');
    return apiFetch(`/products/search?${params.toString()}`, options);
  },
  getProduct: (id) => apiFetch(`/products/${encodeURIComponent(id)}`),
  getTrends: (filters = {}, options = {}) => {
    const params = new URLSearchParams({
      category: filters.category || 'all',
      page: String(filters.page || 1),
      limit: String(filters.limit || 20)
    });
    if (filters.q) params.set('q', filters.q);
    if (filters.refresh) params.set('refresh', 'true');
    return apiFetch(`/trends?${params.toString()}`, options);
  },
  getProviderStatus: () => apiFetch('/search/providers/status'),
  refreshProducts: (filters = {}) => apiFetch('/products/refresh', { method: 'POST', body: JSON.stringify(filters) }),
  integrations: () => apiFetch('/integrations/status'),
  startOAuth: (marketplace) => apiFetch(`/integrations/oauth/${marketplace}/start`),
  scan: (payload) => apiFetch('/bot/scan', { method: 'POST', body: JSON.stringify(payload) }),
  publicSearch: (payload) => apiFetch('/products/public-search', { method: 'POST', body: JSON.stringify(payload) }),
  searchReal: (payload) => apiFetch('/products/search-real', { method: 'POST', body: JSON.stringify(payload) }),
  products: () => apiFetch('/products'),
  saveProduct: (product) => apiFetch('/products/save', { method: 'POST', body: JSON.stringify({ product }) }),
  addToQueue: (product) => apiFetch('/products/publish-queue', { method: 'POST', body: JSON.stringify({ product }) }),
  publishProduct: (marketplace, product) => apiFetch('/products/publish', { method: 'POST', body: JSON.stringify({ marketplace, product }) }),
  orders: () => apiFetch('/orders'),
  syncOrders: () => apiFetch('/orders/sync'),
  finance: () => apiFetch('/finance/summary'),
  settings: () => apiFetch('/settings'),
  saveSettings: (settings) => apiFetch('/settings', { method: 'POST', body: JSON.stringify(settings) }),
  systemCredentials: () => apiFetch('/system-credentials'),
  saveSystemCredentials: (credentials) => apiFetch('/system-credentials', { method: 'POST', body: JSON.stringify(credentials) }),
  setupStatus: () => apiFetch('/system-credentials/status'),
  testMercadoLivrePublicApi: () => apiFetch('/system-credentials/test/mercadolivre'),
  debugNetwork: () => apiFetch('/debug/network'),
  debugMercadoLivre: () => apiFetch('/debug/mercadolivre'),
  debugLastError: () => apiFetch('/debug/last-error')
};

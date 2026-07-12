const API_BASE = 'https://sstbet.onrender.com/Droppingship/api';

window.API_BASE = API_BASE;
const ACCESS_TOKEN_KEY = 'droppingship_access_token';

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
}

function setAccessToken(token = '') {
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
  try {
    const token = getAccessToken();
    const workspaceId = window.DroppingshipAuth?.workspace?.id || '';
    const { headers = {}, ...requestOptions } = options;
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...requestOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
        ...headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Erro ao conversar com a API.');
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('API do Render indisponivel. Verifique deploy, variaveis de ambiente e logs em sstbet.onrender.com.');
    }
    throw error;
  }
}

window.DroppingshipApi = {
  request: apiFetch,
  getAccessToken,
  setAccessToken,
  health: () => apiFetch('/health'),
  auth: {
    register: (payload) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    refresh: () => apiFetch('/auth/refresh', { method: 'POST', body: JSON.stringify({}) }),
    me: () => apiFetch('/auth/me'),
    logout: () => apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({}) }),
    logoutAll: () => apiFetch('/auth/logout-all', { method: 'POST', body: JSON.stringify({}) }),
    sessions: () => apiFetch('/auth/sessions'),
    deleteSession: (sessionId) => apiFetch(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }),
    forgotPassword: (payload) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
    resetPassword: (payload) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
    sendVerification: () => apiFetch('/auth/send-verification', { method: 'POST', body: JSON.stringify({}) }),
    verifyEmail: (payload) => apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify(payload) })
  },
  workspaces: {
    list: () => apiFetch('/workspaces'),
    create: (payload) => apiFetch('/workspaces', { method: 'POST', body: JSON.stringify(payload) }),
    get: (workspaceId) => apiFetch(`/workspaces/${encodeURIComponent(workspaceId)}`),
    update: (workspaceId, payload) => apiFetch(`/workspaces/${encodeURIComponent(workspaceId)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    members: (workspaceId) => apiFetch(`/workspaces/${encodeURIComponent(workspaceId)}/members`),
    invite: (workspaceId, payload) => apiFetch(`/workspaces/${encodeURIComponent(workspaceId)}/invitations`, { method: 'POST', body: JSON.stringify(payload) }),
    updateMember: (workspaceId, memberId, payload) => apiFetch(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteMember: (workspaceId, memberId) => apiFetch(`/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`, { method: 'DELETE' })
  },
  users: {
    me: () => apiFetch('/users/me'),
    updateMe: (payload) => apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),
    updatePassword: (payload) => apiFetch('/users/me/password', { method: 'PATCH', body: JSON.stringify(payload) }),
    deleteMe: () => apiFetch('/users/me', { method: 'DELETE' })
  },
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
  publicSearch: (payload, options = {}) => apiFetch('/products/public-search', { ...options, method: 'POST', body: JSON.stringify(payload) }),
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
  testMercadoLivrePublicApi: () => apiFetch('/system-credentials/test/mercadolivre'),
  debugNetwork: () => apiFetch('/debug/network'),
  debugMercadoLivre: () => apiFetch('/debug/mercadolivre'),
  debugLastError: () => apiFetch('/debug/last-error')
};

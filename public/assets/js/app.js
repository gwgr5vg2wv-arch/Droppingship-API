const state = {
  products: [],
  savedProducts: [],
  publishQueue: [],
  orders: [],
  trends: [],
  integrations: [],
  settings: null
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupForms();
  await refreshAll();
});

function setupTabs() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
      document.querySelectorAll(`[data-tab="${button.dataset.tab}"]`).forEach((item) => item.classList.add('active'));
      document.getElementById(button.dataset.tab)?.classList.add('active');
    });
  });
}

function setupForms() {
  document.getElementById('search-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await searchProducts();
  });

  document.getElementById('real-search-button').addEventListener('click', searchRealProducts);

  document.getElementById('settings-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const settings = {
      profile: {
        name: form.get('profileName') || 'Admin',
        storeName: form.get('storeName') || 'Minha Loja Dropshipping',
        email: form.get('email') || 'admin@droppingship.local',
        plan: form.get('plan') || 'Starter',
        avatar: '/Droppingship/assets/img/avatar-default.svg'
      },
      minimumMargin: Number(form.get('minimumMargin')),
      defaultMarketplaceFeePercent: Number(form.get('defaultMarketplaceFeePercent')),
      minimumProfit: Number(form.get('minimumProfit')),
      automaticMode: form.get('automaticMode') === 'on',
      marketplaces: {
        mercadoLivre: form.get('mercadoLivre') === 'on',
        shopee: form.get('shopee') === 'on',
        aliexpress: form.get('aliexpress') === 'on',
        temu: form.get('temu') === 'on',
        tiktokShop: form.get('tiktokShop') === 'on'
      }
    };
    await window.DroppingshipApi.saveSettings(settings);
    toast('Configuracoes salvas.');
    await loadSettings();
  });
}

async function refreshAll() {
  await Promise.allSettled([
    loadDashboard(),
    loadProducts(),
    loadOrders(),
    loadFinance(),
    loadTrends(),
    loadIntegrations(),
    loadSettings()
  ]);
}

async function searchProducts() {
  const query = document.getElementById('query').value.trim();
  const source = document.getElementById('source').value;
  const results = document.getElementById('product-results');
  results.innerHTML = '<div class="empty">Pesquisando oportunidades...</div>';

  try {
    const data = await window.DroppingshipApi.scan({ query, source });
    state.products = data.products;
    renderProducts();
    await loadDashboard();
  } catch (error) {
    showError(results, error.message);
  }
}

async function searchRealProducts() {
  const query = document.getElementById('query').value.trim();
  const selected = document.getElementById('source').value;
  const sources = selected === 'mock'
    ? ['mercadoLivre', 'shopee', 'temu', 'tiktokShop', 'aliexpress']
    : [selected];
  const results = document.getElementById('product-results');
  results.innerHTML = '<div class="empty">Buscando produtos online sem OAuth...</div>';

  try {
    const data = await window.DroppingshipApi.publicSearch({ query, sources });
    state.products = data.results || data.products || [];
    renderSourceStatus(data.sources || {});
    renderProducts();
    toast('Busca publica concluida com ranking unico.');
    await Promise.all([loadDashboard(), loadIntegrations()]);
  } catch (error) {
    showError(results, error.message);
  }
}

async function loadDashboard() {
  try {
    const summary = await window.DroppingshipApi.dashboard();
    const cards = [
      ['Produtos encontrados hoje', summary.foundToday],
      ['Produtos salvos', summary.savedProducts],
      ['Na fila de anuncio', summary.publishQueue],
      ['Pedidos simulados', summary.simulatedOrders],
      ['Lucro estimado', money.format(summary.estimatedProfit)],
      ['ROI medio', `${summary.averageRoi}%`]
    ];
    document.getElementById('dashboard-cards').innerHTML = cards.map(([label, value]) => metricCard(label, value)).join('');
  } catch (error) {
    showError(document.getElementById('dashboard-cards'), error.message);
  }
}

async function loadProducts() {
  try {
    const data = await window.DroppingshipApi.products();
    state.products = data.products || [];
    state.savedProducts = data.savedProducts || [];
    state.publishQueue = data.publishQueue || [];
    renderProducts();
    renderSaved();
    renderQueue();
  } catch (error) {
    showError(document.getElementById('product-results'), error.message);
  }
}

async function loadOrders() {
  try {
    const data = await window.DroppingshipApi.orders();
    state.orders = data.orders || [];
    document.getElementById('orders-list').innerHTML = state.orders.map(orderCard).join('') || empty('Nenhum pedido simulado ainda.');
  } catch (error) {
    showError(document.getElementById('orders-list'), error.message);
  }
}

async function loadTrends() {
  try {
    const data = await window.DroppingshipApi.trends();
    state.trends = data.categories || [];
    document.getElementById('trends-list').innerHTML = state.trends.map(trendCategoryCard).join('');
  } catch (error) {
    showError(document.getElementById('trends-list'), error.message);
  }
}

async function loadIntegrations() {
  try {
    const data = await window.DroppingshipApi.integrations();
    state.integrations = data.integrations || [];
    document.getElementById('integrations-list').innerHTML = state.integrations.map(integrationCard).join('');
    const summary = document.getElementById('settings-integration-summary');
    if (summary) summary.innerHTML = state.integrations.map((item) => badge(`${item.label}: ${statusText(item.status)}`, item.status)).join('');
    const buttons = document.getElementById('settings-integration-buttons');
    if (buttons) buttons.innerHTML = state.integrations.map((item) => (
      `<button type="button" class="secondary" onclick="connectMarketplace('${item.marketplace}')">Conectar ${item.label}</button>`
    )).join('');
  } catch (error) {
    showError(document.getElementById('integrations-list'), error.message);
  }
}

async function loadFinance() {
  try {
    const data = await window.DroppingshipApi.finance();
    const cards = [
      ['Receita total', money.format(data.revenueTotal)],
      ['Custo total', money.format(data.costTotal)],
      ['Lucro total', money.format(data.profitTotal)],
      ['ROI medio', `${data.averageRoi}%`],
      ['Gastos com frete', money.format(data.shippingTotal)],
      ['Taxas simuladas', money.format(data.simulatedFees)]
    ];
    document.getElementById('finance-cards').innerHTML = cards.map(([label, value]) => metricCard(label, value)).join('');
  } catch (error) {
    showError(document.getElementById('finance-cards'), error.message);
  }
}

async function loadSettings() {
  try {
    const settings = await window.DroppingshipApi.settings();
    state.settings = settings;
    const profile = settings.profile || {};
    document.getElementById('openai-status').textContent = settings.openaiStatus.configured ? 'configurada' : 'nao configurada';
    document.getElementById('header-name').textContent = profile.name || 'Admin';
    document.getElementById('header-plan').textContent = profile.plan || 'Starter';
    document.getElementById('header-avatar').src = localAsset(profile.avatar);
    document.getElementById('profile-avatar').src = localAsset(profile.avatar);
    document.getElementById('profile-title').textContent = profile.storeName || 'Minha Loja Dropshipping';
    document.getElementById('profile-email').textContent = profile.email || 'admin@droppingship.local';
    setInput('profileName', profile.name);
    setInput('storeName', profile.storeName);
    setInput('email', profile.email);
    setInput('plan', profile.plan);
    setInput('minimumMargin', settings.minimumMargin);
    setInput('defaultMarketplaceFeePercent', settings.defaultMarketplaceFeePercent);
    setInput('minimumProfit', settings.minimumProfit);
    setChecked('automaticMode', settings.automaticMode);
    Object.entries(settings.marketplaces).forEach(([key, value]) => setChecked(key, value));
  } catch (error) {
    showError(document.getElementById('settings-error'), error.message);
  }
}

function renderProducts() {
  document.getElementById('product-results').innerHTML = state.products.map(productCard).join('') || empty('Pesquise um produto para encontrar oportunidades.');
}

function renderSaved() {
  document.getElementById('saved-products').innerHTML = state.savedProducts.map((product) => productCard(product, 'saved')).join('') || empty('Nenhum produto salvo ainda.');
}

function renderQueue() {
  document.getElementById('publish-queue').innerHTML = state.publishQueue.map(queueCard).join('') || empty('Nenhum produto na fila de anuncios.');
}

function productCard(product, context = 'search') {
  const integration = getIntegration(product.source);
  const canPublish = Boolean(integration?.accountConnected || integration?.connected);
  const publishTitle = canPublish ? 'Publicar agora' : 'Conecte sua conta para publicar.';
  return `
    <article class="product-card">
      <img src="${product.image}" alt="${product.title}">
      <div class="product-body">
        <div class="product-head">
          <div>
            <span class="pill">${product.source}</span>
            ${badge(modeLabel(product), product.mode || product.source || 'mock')}
            ${product.publicSearchMode ? badge(product.publicSearchMode === 'public' ? 'Fonte REAL publica' : 'Fonte fallback', product.publicSearchMode) : ''}
            <h3>${product.title}</h3>
          </div>
          <strong>${money.format(product.suggestedPrice || 0)}</strong>
        </div>
        <p>${product.generatedDescription}</p>
        ${product.fallbackReason ? `<p class="danger-text">Fallback: ${product.fallbackReason}</p>` : ''}
        <div class="stats-grid">
          ${miniStat('Fornecedor', money.format(product.supplierPrice))}
          ${miniStat('Frete', money.format(product.shippingCost))}
          ${miniStat('Lucro', money.format(product.profit))}
          ${miniStat('Score', product.score ?? '-')}
          ${miniStat('Rating', product.rating)}
          ${miniStat('Vendidos', product.sold)}
          ${miniStat('Entrega', `${product.deliveryDays} dias`)}
        </div>
        <div class="visual-stats">
          ${badge(`ROI ${product.roi}%`, 'good')}
          ${badge(riskLabel(product.riskLevel), product.riskLevel)}
          ${progress('Tendencia', product.trendScore)}
          ${competitionBar(product.competitionLevel)}
        </div>
        <div class="tags">${(product.tags || []).map((tag) => `<span>${tag}</span>`).join('')}</div>
        <div class="actions">
          ${context === 'search' ? `<button onclick="saveProduct('${product.id}')">Salvar</button>` : ''}
          <button onclick="addToQueue('${product.id}', '${context}')">Preparar anuncio</button>
          <button ${canPublish ? '' : 'disabled'} title="${publishTitle}" onclick="publishPreparedProduct('${product.id}', '${context}')">Publicar</button>
          ${canPublish ? '' : '<span class="blocked-note">Conecte sua conta para publicar.</span>'}
          <button class="secondary" onclick="copyListing('${product.id}', '${context}')">Copiar anuncio</button>
        </div>
      </div>
    </article>
  `;
}

function queueCard(product) {
  return `
    <article class="queue-row">
      <div>
        ${badge(product.status, product.status)}
        <h3>${product.generatedTitle || product.title}</h3>
        <p>${product.recommendation || 'Produto pronto para simulacao.'}</p>
      </div>
      <div class="queue-actions">
        <strong>${money.format(product.profit || 0)} lucro</strong>
        <select onchange="setQueueMarketplace('${product.id}', this.value)">
          ${marketplaceOptions(product.marketplace || product.source || 'mercadoLivre')}
        </select>
        <button onclick="publishQueuedProduct('${product.id}')">Publicar</button>
        <button onclick="simulatePublication('${product.id}')">Simular publicacao</button>
      </div>
    </article>
  `;
}

function trendCategoryCard(group) {
  return `
    <article class="trend-category">
      <h3>${group.category}</h3>
      <div class="stack">
        ${(group.items || []).map(trendItemCard).join('')}
      </div>
    </article>
  `;
}

function trendItemCard(item) {
  return `
    <div class="trend-item">
      <div>
        ${badge(item.source || 'mock', item.source || 'mock')}
        <h4>${item.title}</h4>
        <p>${item.reason}</p>
        <div class="tags">${(item.tags || []).map((tag) => `<span>${tag}</span>`).join('')}</div>
      </div>
      <div class="trend-metrics">
        ${progress('Demanda', item.demandScore)}
        ${progress('Tendencia', item.trendScore)}
        ${competitionBar(item.competitionLevel)}
        <strong>${money.format(item.estimatedProfit)} lucro est.</strong>
      </div>
    </div>
  `;
}

function integrationCard(item) {
  return `
    <article class="integration-card">
      <div>
        ${badge(statusText(item.status), item.status)}
        <h3>${item.label}</h3>
        <p>Busca publica: ${item.publicSearch} | Conta conectada: ${item.accountConnected ? 'sim' : 'nao'} | Publicacao: ${item.publishing}</p>
        <p>Modo: ${item.mode} | Configuracao: ${item.configured ? 'credenciais detectadas' : 'mock/faltam credenciais'}</p>
        ${item.lastError ? `<p class="danger-text">${item.lastError}</p>` : ''}
      </div>
      <button onclick="connectMarketplace('${item.marketplace}')">Conectar ${item.label}</button>
    </article>
  `;
}

function orderCard(order) {
  return `
    <article class="queue-row">
      <div>
        ${badge(order.status, order.status)}
        <h3>${order.id} - ${order.product}</h3>
        <p>Cliente: ${order.customer} | Rastreio: ${order.tracking}</p>
      </div>
      <div class="queue-actions">
        <strong>${money.format(order.value)}</strong>
        <span>${money.format(order.profit)} lucro</span>
      </div>
    </article>
  `;
}

window.saveProduct = async (id) => {
  const product = state.products.find((item) => item.id === id);
  await window.DroppingshipApi.saveProduct(product);
  toast('Produto salvo.');
  await Promise.all([loadProducts(), loadDashboard(), loadFinance()]);
};

window.addToQueue = async (id, context) => {
  const collections = context === 'saved' ? state.savedProducts : state.products;
  const product = collections.find((item) => item.id === id);
  await window.DroppingshipApi.addToQueue(product);
  toast('Produto adicionado a fila.');
  await Promise.all([loadProducts(), loadDashboard()]);
};

window.simulatePublication = async (id) => {
  await window.DroppingshipApi.simulatePublication(id);
  toast('Publicacao simulada.');
  await Promise.all([loadProducts(), loadDashboard()]);
};

window.setQueueMarketplace = (id, marketplace) => {
  state.publishQueue = state.publishQueue.map((item) => item.id === id ? { ...item, marketplace } : item);
};

window.publishQueuedProduct = async (id) => {
  const product = state.publishQueue.find((item) => item.id === id);
  const marketplace = product.marketplace || product.source || 'mercadoLivre';
  const data = await window.DroppingshipApi.publishProduct(marketplace, product);
  toast(data.fallbackUsed ? 'Publicacao registrou erro/fallback.' : 'Publicacao enviada para fila.');
  await Promise.all([loadProducts(), loadDashboard(), loadIntegrations()]);
};

window.publishPreparedProduct = async (id, context) => {
  const collections = context === 'saved' ? state.savedProducts : state.products;
  const product = collections.find((item) => item.id === id);
  const marketplace = product.marketplace || product.source || 'mercadoLivre';
  const integration = getIntegration(marketplace);
  if (!integration?.accountConnected && !integration?.connected) {
    toast('Conecte sua conta para publicar.');
    return;
  }
  await window.DroppingshipApi.publishProduct(marketplace, product);
  toast('Publicacao enviada.');
  await Promise.all([loadProducts(), loadDashboard()]);
};

window.connectMarketplace = async (marketplace) => {
  try {
    const data = await window.DroppingshipApi.startOAuth(marketplace);
    window.open(data.authUrl, '_blank', 'noopener,noreferrer');
    toast('URL de conexao aberta.');
  } catch (error) {
    toast(error.message);
  }
};

window.syncOrders = async () => {
  try {
    const data = await window.DroppingshipApi.syncOrders();
    state.orders = data.orders || [];
    document.getElementById('orders-list').innerHTML = state.orders.map(orderCard).join('') || empty('Nenhum pedido simulado ainda.');
    toast(data.fallbackUsed ? 'Sync em fallback mock.' : 'Pedidos sincronizados.');
  } catch (error) {
    toast(error.message);
  }
};

window.copyListing = async (id, context) => {
  const collections = context === 'saved' ? state.savedProducts : state.products;
  const product = collections.find((item) => item.id === id);
  await navigator.clipboard.writeText(`${product.generatedTitle}\n\n${product.generatedDescription}\n\nTags: ${(product.tags || []).join(', ')}`);
  toast('Anuncio copiado.');
};

function metricCard(label, value) {
  return `<article class="metric-card"><span>${label}</span><strong>${value}</strong></article>`;
}

function miniStat(label, value) {
  return `<div><span>${label}</span><strong>${value}</strong></div>`;
}

function empty(text) {
  return `<div class="empty"><img src="assets/img/empty-state.svg" alt=""><strong>${text}</strong></div>`;
}

function showError(element, message) {
  element.innerHTML = `<div class="error">${message}</div>`;
}

function toast(message) {
  const toastEl = document.getElementById('toast');
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2400);
}

function setInput(name, value) {
  const input = document.querySelector(`[name="${name}"]`);
  if (input) input.value = value ?? '';
}

function setChecked(name, value) {
  const input = document.querySelector(`[name="${name}"]`);
  if (input) input.checked = Boolean(value);
}

function badge(text, tone = 'neutral') {
  return `<span class="status-badge ${tone}">${text}</span>`;
}

function progress(label, value) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));
  return `
    <div class="progress-stat">
      <span>${label}</span>
      <strong>${safeValue}</strong>
      <div class="progress"><i style="width:${safeValue}%"></i></div>
    </div>
  `;
}

function competitionBar(level) {
  const value = { baixa: 33, media: 66, alta: 100 }[level] || 33;
  return `
    <div class="progress-stat">
      <span>Concorrencia</span>
      <strong>${level}</strong>
      <div class="progress competition"><i style="width:${value}%"></i></div>
    </div>
  `;
}

function riskLabel(level) {
  const labels = { baixo: 'Risco Baixo', medio: 'Risco Medio', alto: 'Risco Alto' };
  return labels[level] || 'Risco Medio';
}

function modeLabel(product) {
  if (product.mode === 'real') return 'Real';
  if (product.mode === 'public') return 'Publico';
  if (product.mode === 'fallback') return 'Fallback';
  if (product.mode === 'hybrid' || product.fallbackUsed) return 'Hibrido';
  return 'Mock';
}

function marketplaceOptions(selected) {
  return ['mercadoLivre', 'shopee', 'aliexpress', 'temu', 'tiktokShop'].map((marketplace) => (
    `<option value="${marketplace}" ${marketplace === selected ? 'selected' : ''}>${marketplace}</option>`
  )).join('');
}

function statusText(status) {
  return String(status || '').replace('nao-conectado', 'nao conectado');
}

function getIntegration(marketplace) {
  return state.integrations.find((item) => item.marketplace === marketplace);
}

function renderSourceStatus(sources) {
  const container = document.getElementById('source-status-list');
  container.innerHTML = Object.entries(sources).map(([source, info]) => `
    <article class="source-status">
      ${badge(source, info.mode)}
      <strong>${info.ok ? 'Busca publica ativa' : 'Fallback usado'}</strong>
      <span>${info.reason || 'Fonte consultada sem OAuth'}</span>
    </article>
  `).join('');
}

function localAsset(path) {
  return (path || '/Droppingship/assets/img/avatar-default.svg').replace('/Droppingship/', '');
}

const state = {
  products: [],
  savedProducts: [],
  publishQueue: [],
  orders: [],
  trends: [],
  trendsSummary: null,
  trendsFallback: null,
  integrations: [],
  settings: null
};
window.DroppingshipState = state;

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let activeSearchController = null;
let searchDebounce = null;

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupForms();
  await refreshAll();
  activateHashTab();
});

function setupTabs() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      activateTab(button.dataset.tab);
    });
  });
}

function activateTab(tab) {
  document.querySelectorAll('[data-tab]').forEach((item) => item.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
  document.querySelectorAll(`[data-tab="${tab}"]`).forEach((item) => item.classList.add('active'));
  document.getElementById(tab)?.classList.add('active');
}

function activateHashTab() {
  const tab = location.hash.replace('#', '');
  if (tab && document.getElementById(tab)) activateTab(tab);
}

function setupForms() {
  document.getElementById('search-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await searchProducts();
  });

  document.getElementById('real-search-button').addEventListener('click', searchRealProducts);
  document.getElementById('query')?.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      if (document.getElementById('source')?.value !== 'mock' && document.getElementById('query')?.value.trim().length >= 2) {
        searchRealProducts();
      }
    }, 400);
  });
  document.getElementById('refresh-trends')?.addEventListener('click', loadTrends);
  document.getElementById('trends-filters')?.addEventListener('input', renderTrends);
  document.getElementById('trends-filters')?.addEventListener('change', renderTrends);

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
    ? activeMarketplaceSources()
    : [selected];
  const results = document.getElementById('product-results');
  results.innerHTML = '<div class="empty">Buscando produtos online sem OAuth...</div>';

  try {
    if (activeSearchController) activeSearchController.abort();
    activeSearchController = new AbortController();
    const data = await window.DroppingshipApi.publicSearch({ query, sources }, { signal: activeSearchController.signal });
    state.products = data.products || [];
    state.productsFallback = data.fallbackUsed ? data.fallbackReason || 'no_real_sources' : null;
    renderSourceStatus(data.sources || {});
    renderProducts();
    if (!state.products.length) {
      showError(results, data.message || 'Nenhum produto real retornado pelas fontes oficiais.');
    } else {
      toast('Busca concluida com produtos reais retornados pela fonte oficial.');
    }
    await Promise.all([loadDashboard(), loadIntegrations()]);
  } catch (error) {
    if (error.name === 'AbortError') return;
    showError(results, error.message);
  }
}

function activeMarketplaceSources() {
  const allowedNow = ['mercadoLivre', 'aliexpress'];
  const enabled = state.settings?.marketplaces
    ? allowedNow.filter((marketplace) => state.settings.marketplaces[marketplace])
    : [];
  return enabled.length ? enabled : allowedNow;
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
    state.productsFallback = hasFallbackProducts(state.products) ? 'auth_required' : null;
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
    document.getElementById('trends-list').innerHTML = skeletonList(4);
    const data = await window.DroppingshipApi.trends();
    state.trends = data.products || (data.categories || []).flatMap((group) => group.items || []);
    state.trendsSummary = data.summary || null;
    state.trendsFallback = data.fallbackUsed ? data.fallbackReason : null;
    renderTrendsSummary();
    renderTrendCategories(data.categories || []);
    renderTrends();
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
    if (!window.DroppingshipApi?.getAccessToken?.()) {
      document.getElementById('header-name').textContent = profile.name || 'Admin';
      document.getElementById('header-plan').textContent = profile.plan || 'Starter';
    }
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
  const notice = state.productsFallback || hasFallbackProducts(state.products) ? fallbackNotice() : '';
  document.getElementById('product-results').innerHTML = notice + (state.products.map(productCard).join('') || empty('Pesquise um produto para encontrar oportunidades.'));
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
  const price = safeNumber(product.salePrice ?? product.suggestedPrice);
  const description = product.description || product.generatedDescription || product.reason || '';
  const sourceText = product.sourceLabel || sourceLabel(product.source);
  const isFallback = product.isFallback || product.fallbackUsed || ['mock', 'hybrid', 'fallback'].includes(product.mode);
  return `
    <article class="product-card">
      <div class="product-media">
        <span class="image-skeleton"></span>
        <img src="${resolveProductImage(product)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${escapeHtml(product.title)}" onerror="handleProductImageError(this)">
        ${productGallery(product)}
      </div>
      <div class="product-body">
        <div class="product-head">
          <div>
            <span class="pill">${sourceText}</span>
            ${isFallback ? badge('Dados estimados', 'fallback') : ''}
            ${badge(modeLabel(product), product.mode || product.source || 'mock')}
            <h3>${escapeHtml(product.title)}</h3>
          </div>
          <strong>${money.format(price)}</strong>
        </div>
        <p class="product-description">${escapeHtml(description)}</p>
        <div class="stats-grid">
          ${miniStat('Fornecedor', money.format(safeNumber(product.supplierPrice)))}
          ${miniStat('Frete', money.format(safeNumber(product.shippingPrice ?? product.shippingCost)))}
          ${miniStat('Lucro', money.format(safeNumber(product.estimatedProfit ?? product.profit)))}
          ${miniStat('ROI', `${safeNumber(product.roi)}%`)}
          ${miniStat('Score', product.score ?? '-')}
          ${miniStat('Rating', safeNumber(product.rating))}
          ${miniStat('Vendidos', safeNumber(product.soldQuantity ?? product.sold))}
          ${miniStat('Entrega', `${safeNumber(product.deliveryDays)} dias`)}
        </div>
        <div class="visual-stats">
          ${progress('Tendencia', product.trendScore)}
          ${competitionBar(product.competition ?? product.competitionLevel)}
          ${badge(riskLabel(product.risk ?? product.riskLevel), product.risk ?? product.riskLevel)}
        </div>
        <div class="tags">${(product.tags || []).map((tag) => `<span>${tag}</span>`).join('')}</div>
        <div class="actions">
          ${context === 'search' ? `<button onclick="saveProduct('${product.id}')">Salvar</button>` : ''}
          ${product.url || product.productUrl ? `<button class="secondary" onclick="openProductDetails('${product.id}', '${context}')">Ver produto</button>` : ''}
          <button class="primary-action" onclick="addToQueue('${product.id}', '${context}')">Preparar anúncio</button>
          <button ${canPublish ? '' : 'disabled'} title="${publishTitle}" onclick="publishPreparedProduct('${product.id}', '${context}')">Publicar</button>
          ${canPublish ? '' : '<span class="blocked-note">Conecte sua conta para publicar.</span>'}
          <button class="secondary" onclick="copyListing('${product.id}', '${context}')">Copiar anúncio</button>
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

function renderTrendsSummary() {
  const summary = state.trendsSummary || {};
  const cards = [
    ['Produtos analisados', summary.analyzed ?? state.trends.length],
    ['Oportunidades fortes', summary.strongOpportunities ?? 0],
    ['ROI médio', `${summary.averageRoi ?? 0}%`],
    ['Lucro estimado', money.format(summary.estimatedProfit ?? 0)],
    ['Tendências em alta', summary.risingTrends ?? 0]
  ];
  document.getElementById('trends-summary').innerHTML = cards.map(([label, value]) => metricCard(label, value)).join('');
}

function renderTrendCategories(groups = []) {
  const categories = [
    ['electronics', 'Eletrônicos'],
    ['home', 'Casa'],
    ['beauty', 'Beleza'],
    ['fashion', 'Moda'],
    ['tools', 'Ferramentas'],
    ['pet', 'Pet'],
    ['sports', 'Esportes'],
    ['generic', 'Outros']
  ];
  document.getElementById('trend-category-strip').innerHTML = categories.map(([key, label]) => {
    const group = groups.find((item) => categoryKey(item.category) === key);
    const img = group?.image || `/Droppingship/assets/images/products/${key}.png`;
    return `<button type="button" class="category-chip" onclick="setTrendCategory('${key}')"><img src="${localAsset(img)}" alt="">${label}</button>`;
  }).join('');
}

function renderTrends() {
  const filters = trendFilters();
  const ranked = sortTrendProducts(state.trends.filter((item) => trendMatches(item, filters)), filters.sort);
  const notice = state.trendsFallback ? fallbackNotice() : '';
  document.getElementById('trends-list').innerHTML = notice + (ranked.map((item) => productCard(item, 'trends')).join('') || empty('Nenhuma tendência encontrada com esses filtros.'));
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
  const collections = collectionFor(context);
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
  const collections = collectionFor(context);
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
  const collections = collectionFor(context);
  const product = collections.find((item) => item.id === id);
  await navigator.clipboard.writeText(`${product.generatedTitle}\n\n${product.generatedDescription}\n\nTags: ${(product.tags || []).join(', ')}`);
  toast('Anuncio copiado.');
};

window.openProductDetails = (id, context) => {
  const product = collectionFor(context).find((item) => item.id === id);
  if (!product) return;
  const url = product.url || product.productUrl || '';
  const modal = document.getElementById('product-detail-modal') || createProductDetailModal();
  modal.innerHTML = `
    <div class="modal-panel">
      <button class="modal-close" onclick="closeProductDetails()">Fechar</button>
      <div class="detail-gallery">
        ${(product.images && product.images.length ? product.images : [product.image]).slice(0, 4).map((image) => `<img src="${localAsset(image)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="handleProductImageError(this)" alt="">`).join('')}
      </div>
      <div class="detail-content">
        ${badge(product.sourceLabel || sourceLabel(product.source), product.source)}
        <h2>${escapeHtml(product.title)}</h2>
        <p>${escapeHtml(product.description || product.generatedDescription || '')}</p>
        <div class="stats-grid">
          ${miniStat('Custo', money.format(safeNumber(product.supplierPrice)))}
          ${miniStat('Frete', money.format(safeNumber(product.shippingPrice ?? product.shippingCost)))}
          ${miniStat('Total', money.format(safeNumber(product.totalCost)))}
          ${miniStat('Sugerido', money.format(safeNumber(product.suggestedPrice ?? product.salePrice)))}
          ${miniStat('Lucro', money.format(safeNumber(product.estimatedProfit ?? product.profit)))}
          ${miniStat('ROI', `${safeNumber(product.roi)}%`)}
          ${miniStat('Vendidos', safeNumber(product.soldCount ?? product.soldQuantity ?? product.sold))}
          ${miniStat('Entrega', `${safeNumber(product.deliveryDays)} dias`)}
        </div>
        <div class="tags">${(product.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="actions">
          ${url ? `<a class="button-link secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir no fornecedor</a>` : ''}
          <button onclick="addToQueue('${product.id}', '${context}')">Preparar anúncio</button>
          <button class="secondary" onclick="copyListing('${product.id}', '${context}')">Copiar anúncio</button>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('show');
};

window.closeProductDetails = () => {
  document.getElementById('product-detail-modal')?.classList.remove('show');
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
  const value = { baixo: 33, baixa: 33, medio: 66, media: 66, alto: 100, alta: 100 }[level] || 33;
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
      <strong>${info.ok ? 'Busca publica ativa' : 'Fonte indisponivel agora'}</strong>
      <span>${info.fallbackUsed ? sourceStatusMessage(info) : 'Fonte consultada sem OAuth.'}</span>
    </article>
  `).join('');
}

function sourceStatusMessage(info = {}) {
  if (info.message) return escapeHtml(info.message);
  return {
    blocked_public_search: 'Busca publica bloqueada pelo provedor.',
    auth_required: 'Credenciais ou aprovacao oficial necessarias.',
    rate_limit: 'Limite temporario da fonte.',
    no_real_sources: 'Sem resultados reais agora.'
  }[info.fallbackReason] || 'Usando resultados demonstrativos.';
}

function localAsset(path) {
  if (!path) return 'assets/images/products/generic.png';
  if (/^https:\/\//.test(path)) return path;
  if (/^http:\/\//.test(path)) return path.replace('http://', 'https://');
  return path.replace('/Droppingship/', '');
}

function resolveProductImage(product = {}) {
  return localAsset(product.image || product.thumbnail || categoryFallback(product));
}

function productGallery(product = {}) {
  const images = (product.images || []).filter(Boolean).slice(0, 4);
  if (images.length <= 1) return '';
  return `<div class="product-thumbs">${images.map((image) => `<img src="${localAsset(image)}" loading="lazy" decoding="async" alt="">`).join('')}</div>`;
}

function categoryFallback(product = {}) {
  return `/Droppingship/assets/images/products/${categoryKey(product.category || product.title)}.png`;
}

window.handleProductImageError = (img) => {
  if (img.dataset.fallbackApplied) return;
  img.dataset.fallbackApplied = 'true';
  img.src = localAsset('/Droppingship/assets/images/product-placeholder.webp');
};

window.setTrendCategory = (category) => {
  const input = document.getElementById('trend-category');
  if (input) input.value = category;
  renderTrends();
};

function trendFilters() {
  return {
    search: document.getElementById('trend-search')?.value.trim().toLowerCase() || '',
    marketplace: document.getElementById('trend-marketplace')?.value || 'all',
    category: document.getElementById('trend-category')?.value || 'all',
    risk: document.getElementById('trend-risk')?.value || 'all',
    competition: document.getElementById('trend-competition')?.value || 'all',
    sort: document.getElementById('trend-sort')?.value || 'trend'
  };
}

function trendMatches(product, filters) {
  const haystack = `${product.title} ${product.category} ${product.source} ${(product.tags || []).join(' ')}`.toLowerCase();
  if (filters.search && !haystack.includes(filters.search)) return false;
  if (filters.marketplace !== 'all' && product.source !== filters.marketplace) return false;
  if (filters.category !== 'all' && categoryKey(product.category || product.title) !== filters.category) return false;
  if (filters.risk !== 'all' && (product.risk || product.riskLevel) !== filters.risk) return false;
  if (filters.competition !== 'all' && (product.competition || product.competitionLevel) !== filters.competition) return false;
  return true;
}

function sortTrendProducts(products, sort) {
  const competitionRank = { baixo: 1, medio: 2, alto: 3 };
  const riskRank = { baixo: 1, medio: 2, alto: 3 };
  const sorted = [...products];
  const value = (product, key) => safeNumber(product[key]);
  return sorted.sort((a, b) => {
    if (sort === 'roi') return value(b, 'roi') - value(a, 'roi');
    if (sort === 'profit') return value(b, 'estimatedProfit') - value(a, 'estimatedProfit');
    if (sort === 'sold') return value(b, 'soldQuantity') - value(a, 'soldQuantity');
    if (sort === 'competition') return (competitionRank[a.competition || a.competitionLevel] || 2) - (competitionRank[b.competition || b.competitionLevel] || 2);
    if (sort === 'risk') return (riskRank[a.risk || a.riskLevel] || 2) - (riskRank[b.risk || b.riskLevel] || 2);
    if (sort === 'delivery') return value(a, 'deliveryDays') - value(b, 'deliveryDays');
    return value(b, 'trendScore') - value(a, 'trendScore');
  });
}

function categoryKey(value = '') {
  const text = String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/electronics|fone|headset|camera|smart|relogio|carregador|eletr/.test(text)) return 'electronics';
  if (/beauty|beleza|escova|secador|maquiagem/.test(text)) return 'beauty';
  if (/home|casa|cozinha|luminaria|organizador/.test(text)) return 'home';
  if (/tools|ferramenta|tool|chave|furadeira/.test(text)) return 'tools';
  if (/fashion|moda|bolsa|roupa|calcado/.test(text)) return 'fashion';
  if (/pet|cachorro|gato/.test(text)) return 'pet';
  if (/esporte|fitness|sports|garrafa|squeeze/.test(text)) return 'sports';
  return 'generic';
}

function fallbackNotice() {
  return '<div class="fallback-notice"><span>i</span>Resultados demonstrativos - conecte sua conta para consultar dados ao vivo.</div>';
}

function hasFallbackProducts(products = []) {
  return products.some((product) => product.isFallback || product.fallbackUsed || product.fallbackReason);
}

function sourceLabel(source) {
  return {
    mercadoLivre: 'Mercado Livre',
    shopee: 'Shopee',
    aliexpress: 'AliExpress',
    temu: 'Temu',
    tiktokShop: 'TikTok Shop',
    mock: 'Demonstracao',
    hybrid: 'Dados estimados'
  }[source] || source || 'Demonstracao';
}

function collectionFor(context) {
  if (context === 'saved') return state.savedProducts;
  if (context === 'trends') return state.trends;
  return state.products;
}

function createProductDetailModal() {
  const modal = document.createElement('div');
  modal.id = 'product-detail-modal';
  modal.className = 'product-modal';
  document.body.appendChild(modal);
  return modal;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round((number + Number.EPSILON) * 100) / 100 : 0;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function skeletonList(count = 3) {
  return Array.from({ length: count }, () => '<article class="product-card skeleton-card"><span></span><div><i></i><i></i><i></i></div></article>').join('');
}

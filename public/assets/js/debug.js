async function renderDiagnostic(status) {
  const container = document.getElementById('diagnostic-status');
  if (!container) return;

  container.innerHTML = `
    <article class="diagnostic-card">
      <div>
        <h3>Modo atual</h3>
        <p>${status.mode || 'mock'}</p>
      </div>
      <div>
        <h3>Última URL chamada</h3>
        <p>${status.lastUrl || 'nenhuma'}</p>
      </div>
      <div>
        <h3>Último erro</h3>
        <p>${status.lastError || 'nenhum'}</p>
      </div>
      <div>
        <h3>Tempo de resposta</h3>
        <p>${status.lastResponseTimeMs ? `${status.lastResponseTimeMs} ms` : 'n/a'}</p>
      </div>
      <div>
        <h3>Produtos reais</h3>
        <p>${status.lastResultCount || 0}</p>
      </div>
      <div>
        <h3>Última verificação</h3>
        <p>${status.lastRequestAt || 'nenhuma'}</p>
      </div>
    </article>
  `;
}

window.loadDiagnostic = async () => {
  try {
    const status = await window.DroppingshipApi.debugLastError();
    renderDiagnostic(status);
  } catch (error) {
    document.getElementById('diagnostic-status').innerHTML = `<div class="error">${error.message}</div>`;
  }
};

window.checkNetwork = async () => {
  try {
    const status = await window.DroppingshipApi.debugNetwork();
    renderDiagnostic(status);
    toast(`Internet: ${status.online ? 'online' : 'offline'}`);
  } catch (error) {
    toast(error.message);
  }
};

window.checkMercadoLivre = async () => {
  try {
    const status = await window.DroppingshipApi.debugMercadoLivre();
    renderDiagnostic(status);
    toast(`Mercado Livre: ${status.online ? 'online' : 'offline'}`);
  } catch (error) {
    toast(error.message);
  }
};

window.findBestProducts = async () => {
  const list = document.getElementById('best-products-list');
  list.innerHTML = '<div class="empty"><strong>Buscando oportunidades online...</strong></div>';
  try {
    const data = await window.DroppingshipApi.onlineTrends();
    const cards = data.terms.map((term) => `
      <article class="trend-item best-product" onclick="searchTrendProducts('${term.searchTerm}')">
        <div>
          <span class="status-badge ${term.opportunityScore >= 80 ? 'good' : term.opportunityScore >= 60 ? 'warning' : 'neutral'}">${term.opportunityScore} pts</span>
          <h4>${term.title}</h4>
          <p>${term.reason}</p>
        </div>
        <div class="trend-metrics">
          <strong>Preço médio ${Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(term.avgPrice)}</strong>
          <span>Vendidos: ${term.totalSold}</span>
          <span>ROI Médio: ${term.avgRoi}%</span>
        </div>
      </article>
    `).join('');
    list.innerHTML = cards || '<div class="empty"><strong>Não foram encontradas oportunidades.</strong></div>';
  } catch (error) {
    list.innerHTML = `<div class="error">${error.message}</div>`;
  }
};

window.searchTrendProducts = async (query) => {
  const results = document.getElementById('product-results');
  const bestList = document.getElementById('best-products-list');
  if (bestList) bestList.innerHTML = '<div class="empty"><strong>Buscando produtos para a tendência...</strong></div>';

  try {
    const data = await window.DroppingshipApi.opportunities({ query, sources: ['mercadoLivre'] });
    state.products = data.products || [];
    renderProducts();
    document.querySelector('[data-tab="search"]').click();
    toast(`Resultados para ${query} carregados.`);
  } catch (error) {
    if (bestList) bestList.innerHTML = `<div class="error">${error.message}</div>`;
  }
};

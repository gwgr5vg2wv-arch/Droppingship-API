const setupApiDefinitions = [
  {
    id: 'mercadoLivre',
    label: 'Mercado Livre',
    required: true,
    links: [
      ['Abrir painel developer', 'https://developers.mercadolivre.com.br/devcenter'],
      ['Criar aplicativo', 'https://developers.mercadolivre.com.br/devcenter'],
      ['Abrir documentacao OAuth', 'https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao']
    ],
    fields: [
      ['MERCADO_LIVRE_CLIENT_ID', 'CLIENT_ID'],
      ['MERCADO_LIVRE_CLIENT_SECRET', 'CLIENT_SECRET', true],
      ['MERCADO_LIVRE_REDIRECT_URI', 'REDIRECT_URI', false, 'https://sstbet.onrender.com/Droppingship/api/integrations/oauth/mercadoLivre/callback']
    ],
    steps: ['Criar app no painel', 'Colar Client ID', 'Colar Secret', 'Copiar Redirect URI', 'Salvar credenciais', 'Testar API publica']
  },
  {
    id: 'shopee',
    label: 'Shopee',
    links: [['Abrir Open Platform', 'https://open.shopee.com']],
    fields: [
      ['SHOPEE_PARTNER_ID', 'PARTNER_ID'],
      ['SHOPEE_PARTNER_KEY', 'PARTNER_KEY', true],
      ['SHOPEE_SHOP_ID', 'SHOP_ID'],
      ['SHOPEE_REDIRECT_URI', 'REDIRECT_URI', false, 'https://sstbet.onrender.com/Droppingship/api/integrations/oauth/shopee/callback']
    ],
    steps: ['Criar app no painel', 'Colar Partner ID', 'Colar Partner Key', 'Colar Shop ID', 'Salvar credenciais']
  },
  {
    id: 'tiktokShop',
    label: 'TikTok Shop',
    links: [['Abrir Partner Center', 'https://partner.tiktokshop.com']],
    fields: [
      ['TIKTOK_SHOP_APP_KEY', 'APP_KEY'],
      ['TIKTOK_SHOP_APP_SECRET', 'APP_SECRET', true],
      ['TIKTOK_SHOP_REDIRECT_URI', 'REDIRECT_URI', false, 'https://sstbet.onrender.com/Droppingship/api/integrations/oauth/tiktokShop/callback']
    ],
    steps: ['Criar app no painel', 'Colar App Key', 'Colar App Secret', 'Salvar credenciais']
  },
  {
    id: 'aliexpress',
    label: 'AliExpress',
    links: [['Abrir Open Platform', 'https://open.aliexpress.com']],
    fields: [
      ['ALIEXPRESS_APP_KEY', 'APP_KEY'],
      ['ALIEXPRESS_APP_SECRET', 'APP_SECRET', true],
      ['ALIEXPRESS_REDIRECT_URI', 'REDIRECT_URI', false, 'https://sstbet.onrender.com/Droppingship/api/integrations/oauth/aliexpress/callback']
    ],
    steps: ['Criar app no painel', 'Colar App Key', 'Colar App Secret', 'Copiar Redirect URI', 'Salvar credenciais']
  },
  {
    id: 'temu',
    label: 'Temu',
    links: [['Abrir Seller/Partner', 'https://seller.temu.com']],
    fields: [
      ['TEMU_APP_KEY', 'APP_KEY'],
      ['TEMU_APP_SECRET', 'APP_SECRET', true]
    ],
    steps: ['Criar app no painel', 'Colar App Key', 'Colar App Secret', 'Salvar credenciais']
  }
];

let setupStatus = {};

document.addEventListener('DOMContentLoaded', () => {
  renderSetupApiCards();
  document.getElementById('export-setup-status')?.addEventListener('click', exportSetupStatus);
  loadSetupStatus();
});

async function loadSetupStatus() {
  const container = document.getElementById('setup-api-cards');
  if (!container) return;

  try {
    const data = await window.DroppingshipApi.setupStatus();
    setupStatus = data.status || {};
    updateSetupStatusBadges();
  } catch (error) {
    container.insertAdjacentHTML('afterbegin', `<div class="error">${error.message}</div>`);
  }
}

function renderSetupApiCards() {
  const container = document.getElementById('setup-api-cards');
  if (!container) return;
  container.innerHTML = setupApiDefinitions.map(setupApiCard).join('');
}

function setupApiCard(definition) {
  return `
    <article class="setup-api-card" data-marketplace="${definition.id}">
      <div class="setup-api-head">
        <div>
          <span class="mini-badge">${definition.required ? 'Obrigatorio' : 'Opcional'}</span>
          <h3>${definition.label}</h3>
        </div>
        <strong class="status-badge pendente" data-setup-status="${definition.id}">nao configurado</strong>
      </div>

      <ol class="setup-steps">
        ${definition.steps.map((step) => `<li>${step}</li>`).join('')}
      </ol>

      <div class="setup-link-row">
        ${definition.links.map(([label, url]) => `<button type="button" class="secondary" onclick="openSetupLink('${url}')">${label}</button>`).join('')}
      </div>

      <form class="setup-credentials-form" data-setup-form="${definition.id}">
        ${definition.fields.map((field) => setupField(definition.id, field)).join('')}
        <div class="setup-card-actions">
          <button type="submit">Salvar credenciais</button>
          ${definition.id === 'mercadoLivre' ? '<button type="button" class="secondary test-button" onclick="testMercadoLivrePublicApi()">Verificar credenciais</button>' : ''}
          ${definition.fields.some((field) => field[3]) ? `<button type="button" class="secondary" onclick="copyRedirectUri('${definition.id}')">Copiar Redirect URI</button>` : ''}
          <button type="button" class="secondary" onclick="markSetupReady('${definition.id}')">Marcar como pronto</button>
        </div>
      </form>
    </article>
  `;
}

function setupField(marketplace, [key, label, secret = false, lockedValue = '']) {
  const fieldId = `${marketplace}-${key}`;
  const locked = Boolean(lockedValue);
  const type = secret ? 'password' : 'text';
  const value = locked ? ` value="${lockedValue}"` : '';
  const readonly = locked ? ' readonly' : '';
  const placeholder = locked ? '' : 'Cole aqui';

  return `
    <label>
      <span>${label} <em data-field-status="${key}">nao configurado</em></span>
      <input id="${fieldId}" name="${key}" type="${type}" autocomplete="off" placeholder="${placeholder}"${value}${readonly}>
    </label>
  `;
}

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-setup-form]');
  if (!form) return;
  event.preventDefault();

  const payload = {};
  new FormData(form).forEach((value, key) => {
    const text = String(value || '').trim();
    if (text) payload[key] = text;
  });

  try {
    await window.DroppingshipApi.saveSystemCredentials(payload);
    form.querySelectorAll('input[type="password"]').forEach((input) => {
      input.value = '';
      input.placeholder = 'Configurado. Cole uma nova key para trocar.';
    });
    toast('Credenciais salvas.');
    await loadSetupStatus();
    await loadIntegrations();
  } catch (error) {
    toast(error.message);
  }
});

window.openSetupLink = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

window.copyRedirectUri = async (marketplace) => {
  const definition = setupApiDefinitions.find((item) => item.id === marketplace);
  const redirect = definition?.fields.find((field) => field[3])?.[3];
  if (!redirect) return;
  await navigator.clipboard.writeText(redirect);
  toast('Redirect URI copiada.');
};

window.testMercadoLivrePublicApi = async () => {
  try {
    const result = await window.DroppingshipApi.testMercadoLivrePublicApi();
    toast(result.message || 'Credenciais Mercado Livre verificadas.');
  } catch (error) {
    toast(error.message);
  }
};

window.markSetupReady = (marketplace) => {
  const item = setupStatus[marketplace];
  if (!item?.configured) {
    toast('Ainda faltam campos para configurar.');
    return;
  }
  localStorage.setItem(`setup-ready-${marketplace}`, 'true');
  updateSetupStatusBadges();
  toast('Marketplace marcado como pronto.');
};

function updateSetupStatusBadges() {
  setupApiDefinitions.forEach((definition) => {
    const item = setupStatus[definition.id] || {};
    const configured = Boolean(item.configured);
    const ready = configured && localStorage.getItem(`setup-ready-${definition.id}`) === 'true';
    const status = document.querySelector(`[data-setup-status="${definition.id}"]`);
    const card = document.querySelector(`[data-marketplace="${definition.id}"]`);

    if (status) {
      status.textContent = ready ? 'pronto' : configured ? 'configurado' : 'nao configurado';
      status.className = `status-badge ${configured ? 'good' : 'pendente'}`;
    }
    if (card) card.classList.toggle('configured', configured);

    Object.entries(item.fields || {}).forEach(([key, fieldConfigured]) => {
      document.querySelectorAll(`[data-field-status="${key}"]`).forEach((fieldStatus) => {
        fieldStatus.textContent = fieldConfigured ? 'configurado' : 'nao configurado';
      });
    });
  });
}

function exportSetupStatus() {
  const labels = {
    mercadoLivre: 'Mercado Livre',
    shopee: 'Shopee',
    tiktokShop: 'TikTok',
    aliexpress: 'AliExpress',
    temu: 'Temu'
  };
  const exportData = Object.fromEntries(
    setupApiDefinitions.map((definition) => [
      labels[definition.id],
      setupStatus[definition.id]?.configured ? 'configurado' : 'nao configurado'
    ])
  );
  const content = JSON.stringify(exportData, null, 2);
  const output = document.getElementById('setup-export-output');
  if (output) output.textContent = content;

  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'status-setup-apis.json';
  link.click();
  URL.revokeObjectURL(url);
  toast('Status exportado sem secrets.');
}

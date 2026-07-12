const authState = {
  user: null,
  workspace: null,
  workspaces: []
};

document.addEventListener('DOMContentLoaded', async () => {
  setupAuthForms();
  try {
    const session = await window.DroppingshipApi.auth.refresh();
    applyAuth(session);
  } catch {
    showAuth();
  }
});

window.addEventListener('droppingship:auth', (event) => applyAuth(event.detail));

function setupAuthForms() {
  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.addEventListener('click', () => showAuthPanel(button.dataset.authTab));
  });

  document.getElementById('login-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await authAction(() => window.DroppingshipApi.auth.login(formObject(event.currentTarget)), 'Login realizado.');
  });

  document.getElementById('register-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await authAction(() => window.DroppingshipApi.auth.register(formObject(event.currentTarget)), 'Cadastro criado.');
    activateTab('onboarding');
  });

  document.getElementById('forgot-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const result = await window.DroppingshipApi.auth.forgotPassword(formObject(event.currentTarget));
    authMessage(result.devToken ? `Token de desenvolvimento: ${result.devToken}` : 'Solicitacao registrada.');
  });

  document.getElementById('reset-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await window.DroppingshipApi.auth.resetPassword(formObject(event.currentTarget));
    authMessage('Senha redefinida.');
    showAuthPanel('login');
  });

  document.getElementById('verify-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await window.DroppingshipApi.auth.verifyEmail(formObject(event.currentTarget));
    authMessage('Email verificado.');
  });

  document.getElementById('logout-button')?.addEventListener('click', async () => {
    await window.DroppingshipApi.auth.logout();
    window.DroppingshipApi.setAccessToken('');
    showAuth();
  });

  document.getElementById('logout-all-button')?.addEventListener('click', async () => {
    await window.DroppingshipApi.auth.logoutAll();
    window.DroppingshipApi.setAccessToken('');
    showAuth();
  });

  document.getElementById('workspace-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await window.DroppingshipApi.workspaces.create(formObject(event.currentTarget));
    event.currentTarget.reset();
    await loadAuthWorkspaceData();
  });

  document.getElementById('onboarding-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get('workspaceName');
    if (authState.workspace?.id && name) {
      await window.DroppingshipApi.workspaces.update(authState.workspace.id, { name });
      await loadAuthWorkspaceData();
    }
  });

  document.getElementById('invite-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!authState.workspace?.id) return;
    await window.DroppingshipApi.workspaces.invite(authState.workspace.id, formObject(event.currentTarget));
    event.currentTarget.reset();
    await loadTeam();
  });
}

async function authAction(action, message) {
  try {
    const result = await action();
    applyAuth(result);
    authMessage(message);
  } catch (error) {
    authMessage(error.message, true);
  }
}

function applyAuth(result) {
  if (!result?.accessToken) return;
  window.DroppingshipApi.setAccessToken(result.accessToken);
  authState.user = result.user;
  authState.workspace = result.workspace;
  document.getElementById('auth-screen')?.classList.add('hidden');
  document.querySelector('.shell')?.classList.remove('locked');
  document.getElementById('header-name').textContent = result.user?.name || 'Usuario';
  document.getElementById('header-plan').textContent = result.workspace?.name || 'Workspace';
  loadAuthWorkspaceData();
}

function showAuth() {
  document.getElementById('auth-screen')?.classList.remove('hidden');
  document.querySelector('.shell')?.classList.add('locked');
}

function showAuthPanel(panel) {
  document.querySelectorAll('[data-auth-tab]').forEach((button) => button.classList.toggle('active', button.dataset.authTab === panel));
  document.querySelectorAll('[data-auth-panel]').forEach((item) => item.classList.toggle('active', item.dataset.authPanel === panel));
}

async function loadAuthWorkspaceData() {
  try {
    const data = await window.DroppingshipApi.workspaces.list();
    authState.workspaces = data.workspaces || [];
    authState.workspace = authState.workspace || authState.workspaces[0] || null;
    renderWorkspaces();
    renderOnboarding();
    await Promise.allSettled([loadTeam(), loadSessions()]);
  } catch (error) {
    authMessage(error.message, true);
  }
}

function renderWorkspaces() {
  const target = document.getElementById('workspace-list');
  if (!target) return;
  target.innerHTML = authState.workspaces.map((workspace) => `
    <article class="queue-row">
      <div>
        <h3>${escapeAuth(workspace.name)}</h3>
        <p>Papel: ${workspace.members?.[0]?.role || '-'}</p>
      </div>
      <button type="button" class="secondary" onclick="selectWorkspace('${workspace.id}')">Usar</button>
    </article>
  `).join('') || '<div class="empty">Nenhum workspace encontrado.</div>';
}

function renderOnboarding() {
  const target = document.getElementById('onboarding-cards');
  if (!target) return;
  const cards = [
    ['Workspace', authState.workspace?.name || 'Nao selecionado'],
    ['Mercado Livre', 'desconectado'],
    ['AliExpress', 'desconectado'],
    ['Produtos salvos', '0'],
    ['Pedidos reais', '0'],
    ['Proximo passo', 'Conectar integracoes']
  ];
  target.innerHTML = cards.map(([label, value]) => `<article class="metric-card"><span>${label}</span><strong>${value}</strong></article>`).join('');
}

async function loadTeam() {
  const target = document.getElementById('team-list');
  if (!target || !authState.workspace?.id) return;
  try {
    const data = await window.DroppingshipApi.workspaces.members(authState.workspace.id);
    target.innerHTML = (data.members || []).map((member) => `
      <article class="queue-row">
        <div>
          <h3>${escapeAuth(member.user?.name || member.invitedEmail || 'Membro')}</h3>
          <p>${escapeAuth(member.user?.email || member.invitedEmail || '')}</p>
        </div>
        <div class="queue-actions">
          <strong>${member.role}</strong>
          <button type="button" class="secondary" onclick="removeTeamMember('${member.id}')">Remover</button>
        </div>
      </article>
    `).join('') || '<div class="empty">Nenhum membro encontrado.</div>';
  } catch (error) {
    target.innerHTML = `<div class="error">${escapeAuth(error.message)}</div>`;
  }
}

async function loadSessions() {
  const target = document.getElementById('session-list');
  if (!target) return;
  const data = await window.DroppingshipApi.auth.sessions();
  target.innerHTML = (data.sessions || []).map((session) => `
    <article class="queue-row">
      <div>
        <h3>${new Date(session.createdAt).toLocaleString('pt-BR')}</h3>
        <p>${escapeAuth(session.userAgent || 'Dispositivo nao identificado')}</p>
      </div>
      <button type="button" class="secondary" onclick="revokeSession('${session.id}')">Revogar</button>
    </article>
  `).join('') || '<div class="empty">Nenhuma sessao ativa.</div>';
}

window.selectWorkspace = (id) => {
  authState.workspace = authState.workspaces.find((workspace) => workspace.id === id) || authState.workspace;
  document.getElementById('header-plan').textContent = authState.workspace?.name || 'Workspace';
  renderWorkspaces();
  renderOnboarding();
  loadTeam();
};

window.removeTeamMember = async (memberId) => {
  if (!authState.workspace?.id) return;
  await window.DroppingshipApi.workspaces.deleteMember(authState.workspace.id, memberId);
  await loadTeam();
};

window.revokeSession = async (sessionId) => {
  await window.DroppingshipApi.auth.deleteSession(sessionId);
  await loadSessions();
};

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function authMessage(message, error = false) {
  const target = document.getElementById('auth-message');
  if (!target) return;
  target.textContent = message;
  target.classList.toggle('error-text', error);
}

function escapeAuth(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

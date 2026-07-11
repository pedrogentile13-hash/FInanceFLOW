/* ============================================================
   FinanceFlow · core/ui.js
   Tema, cor principal, sidebar, topbar, toast, modal,
   seletor de período, PWA e defaults do Chart.js.
   ============================================================ */

(function (FF) {
  'use strict';

  /* ---------- presets de cor principal ---------- */
  FF.ACCENTS = {
    azul:    { nome: 'Azul FinanceFlow', a: '#000A64', b: '#2E3BC9', b2: '#1B27A6', soft: '#CCD3FF', softer: '#E4E8FF', darkP: '#8B96FF', darkP6: '#A5AEFF' },
    roxo:    { nome: 'Roxo Nebula',      a: '#3B0764', b: '#7C3AED', b2: '#6D28D9', soft: '#E9D5FF', softer: '#F3E8FF', darkP: '#C4B5FD', darkP6: '#DDD6FE' },
    verde:   { nome: 'Verde Fortuna',    a: '#064E3B', b: '#059669', b2: '#047857', soft: '#A7F3D0', softer: '#D1FAE5', darkP: '#6EE7B7', darkP6: '#A7F3D0' },
    rosa:    { nome: 'Rosa Aurora',      a: '#831843', b: '#DB2777', b2: '#BE185D', soft: '#FBCFE8', softer: '#FCE7F3', darkP: '#F9A8D4', darkP6: '#FBCFE8' },
    laranja: { nome: 'Laranja Impulso',  a: '#7C2D12', b: '#EA580C', b2: '#C2410C', soft: '#FED7AA', softer: '#FFEDD5', darkP: '#FDBA74', darkP6: '#FED7AA' },
    ciano:   { nome: 'Ciano Oceano',     a: '#164E63', b: '#0891B2', b2: '#0E7490', soft: '#A5F3FC', softer: '#CFFAFE', darkP: '#67E8F9', darkP6: '#A5F3FC' },
  };

  FF.applyTheme = () => {
    const s = FF.state.settings;
    document.documentElement.setAttribute('data-theme', s.theme);
    const ac = FF.ACCENTS[s.accent] || FF.ACCENTS.azul;
    const r = document.documentElement.style;
    const dark = s.theme === 'dark';
    r.setProperty('--grad-a', ac.a);
    r.setProperty('--grad-b', ac.b);
    r.setProperty('--primary', dark ? ac.darkP : ac.a);
    r.setProperty('--primary-500', dark ? ac.darkP : ac.b);
    r.setProperty('--primary-600', dark ? ac.darkP6 : ac.b2);
    r.setProperty('--secondary', dark ? `color-mix(in srgb, ${ac.b} 32%, #131629)` : ac.soft);
    r.setProperty('--secondary-soft', dark ? `color-mix(in srgb, ${ac.b} 18%, #131629)` : ac.softer);
    // superfícies da sidebar escura derivadas do accent
    r.setProperty('--side-bg', `color-mix(in srgb, ${ac.a} ${dark ? '52%' : '86%'}, #07091C)`);
    r.setProperty('--side-bg2', `color-mix(in srgb, ${ac.b} 22%, #0A0D24)`);
    r.setProperty('--side-active', `color-mix(in srgb, ${ac.b} 38%, transparent)`);
  };

  FF.toggleTheme = () => {
    FF.state.settings.theme = FF.state.settings.theme === 'dark' ? 'light' : 'dark';
    FF.save();
    FF.applyTheme();
    const b = document.getElementById('themeBtn');
    if (b) b.innerHTML = FF.icon(FF.state.settings.theme === 'dark' ? 'sun' : 'moon');
    FF.chartDefaults();
    document.dispatchEvent(new CustomEvent('ff:theme'));
  };

  /* ---------- toast ---------- */
  FF.toast = (msg, kind = '', emoji = '') => {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const iconName = { success: 'check', error: 'x', xp: 'zap' }[kind] || 'activity';
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<span class="t-ic">${FF.icon(iconName, 16)}</span><span>${msg}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 350); }, 3400);
  };

  /* ---------- modal ---------- */
  FF.modal = ({ title, body, onSave, saveLabel = 'Salvar' }) => {
    FF.closeModal();
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <h3>${title}</h3>
          <button class="modal-close" aria-label="Fechar">${FF.icon('x', 15)}</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-cancel>Cancelar</button>
          <button class="btn btn-primary" data-save>${saveLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 220); };
    ov.querySelector('.modal-close').onclick = close;
    ov.querySelector('[data-cancel]').onclick = close;
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('[data-save]').onclick = () => { if (onSave(ov) !== false) close(); };
    return ov;
  };

  FF.closeModal = () => document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

  FF.confirmDialog = (msg, onYes) => {
    FF.modal({
      title: 'Confirmar',
      body: `<p class="muted" style="font-size:14px">${msg}</p>`,
      saveLabel: 'Confirmar',
      onSave: () => { onYes(); },
    });
  };

  /* ---------- sidebar ---------- */
  const NAV = () => [
    { label: FF.t('general'), items: [
      { href: 'dashboard.html', icon: 'grid', nome: FF.t('dashboard') },
      { href: 'entradas.html', icon: 'trending-up', nome: FF.t('in') },
      { href: 'saidas.html', icon: 'trending-down', nome: FF.t('out') },
    ]},
    { label: FF.t('planning'), items: [
      { href: 'metas.html', icon: 'target', nome: FF.t('goals') },
      { href: 'sonhos.html', icon: 'star', nome: FF.t('dreams') },
      { href: 'investimentos.html', icon: 'bar-chart', nome: FF.t('invest') },
      { href: 'projetos.html', icon: 'briefcase', nome: FF.t('projects') },
    ]},
    { label: FF.t('intelligence'), items: [
      { href: 'estatisticas.html', icon: 'pie-chart', nome: FF.t('stats') },
      { href: 'ia-financeira.html', icon: 'cpu', nome: FF.t('ai') },
      { href: 'simulador.html', icon: 'calculator', nome: FF.t('sim') },
      { href: 'conquistas.html', icon: 'award', nome: FF.t('achievements') },
    ]},
    { label: FF.t('system'), items: [
      { href: 'configuracoes.html', icon: 'settings', nome: FF.t('settings') },
    ]},
  ];

  FF.renderSidebar = () => {
    const el = document.getElementById('sidebar');
    if (!el) return;
    const page = location.pathname.split('/').pop() || 'dashboard.html';
    const session = FF.session();
    el.className = 'sidebar';
    el.innerHTML = `
      <a class="brand" href="../index.html">
        <span class="brand-mark">F</span>
        <span class="brand-name">Finance<span>Flow</span></span>
      </a>
      ${NAV().map(sec => `
        <div class="nav-section">
          <div class="nav-label">${sec.label}</div>
          ${sec.items.map(it => `
            <a class="nav-item ${page === it.href ? 'active' : ''}" href="${it.href}">
              ${FF.icon(it.icon, 17)} <span>${it.nome}</span>
            </a>`).join('')}
        </div>`).join('')}
      <div class="sidebar-footer">
        <div class="level-chip" id="levelChip"></div>
        <div class="cloud-status" id="cloudStatus" hidden></div>
        <a class="user-chip" href="${session ? 'configuracoes.html' : '../index.html#conta'}" id="userChip">
          <span class="uc-avatar">${session ? FF.esc((session.nome || session.email || '?').charAt(0).toUpperCase()) : FF.icon('user', 15)}</span>
          <span class="uc-info">
            <b>${session ? FF.esc(session.nome || session.email) : FF.t('guest')}</b>
            <span>${session ? FF.esc(session.email || '') : FF.t('login')}</span>
          </span>
        </a>
        <div class="side-actions">
          <button class="side-btn" id="exportBtn" title="${FF.t('export')}">${FF.icon('download', 15)} <span>Backup</span></button>
          <button class="side-btn" id="importBtn" title="${FF.t('import')}">${FF.icon('upload', 15)} <span>Restaurar</span></button>
        </div>
        <button class="side-btn install-btn" id="installBtn" style="display:none">${FF.icon('smartphone', 15)} <span>Instalar app</span></button>
      </div>`;

    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
    backdrop.onclick = () => { el.classList.remove('open'); backdrop.classList.remove('show'); };
    window.__ffToggleSidebar = () => { el.classList.toggle('open'); backdrop.classList.toggle('show'); };

    FF.renderLevelChip();
    FF.renderCloudStatus();
    document.getElementById('exportBtn').onclick = FF.exportJSON;
    document.getElementById('importBtn').onclick = FF.importJSON;
    bindInstallButton();
  };

  /* ---------- status visível da nuvem ---------- */
  FF.renderCloudStatus = () => {
    const el = document.getElementById('cloudStatus');
    if (!el) return;
    const sess = FF.session();
    if (!sess || sess.provider !== 'supabase' || !FF.supabaseConfig()) { el.hidden = true; return; }
    const info = (FF.syncInfo && FF.syncInfo()) || { status: 'idle' };
    el.hidden = false;
    if (info.status === 'ok') {
      el.className = 'cloud-status ok';
      el.innerHTML = `${FF.icon('cloud', 13)} <span>Nuvem sincronizada</span>`;
    } else if (info.status === 'error') {
      el.className = 'cloud-status err';
      el.title = info.error || '';
      el.innerHTML = `${FF.icon('cloud', 13)} <span>Erro ao sincronizar</span>`;
    } else if (info.status === 'no-jwt') {
      el.className = 'cloud-status warn';
      el.innerHTML = `${FF.icon('cloud', 13)} <span>Entre novamente p/ sincronizar</span>`;
    } else {
      el.className = 'cloud-status';
      el.innerHTML = `${FF.icon('cloud', 13)} <span>Conectando à nuvem…</span>`;
    }
  };

  // sessão sem token válido (conta antiga/expirada): banner persistente com
  // ação clara em vez de um toast que some — sem isso, nada salva na nuvem
  // e o usuário não descobre o porquê
  function showReloginBanner() {
    if (document.getElementById('cloudBanner')) return;
    const main = document.querySelector('.main');
    if (!main) return;
    const div = document.createElement('div');
    div.id = 'cloudBanner';
    div.className = 'cloud-banner';
    div.innerHTML = `
      <span>${FF.icon('cloud', 15)} Sua sessão na nuvem expirou — seus lançamentos <b>não estão sendo salvos no banco</b>.</span>
      <button class="btn btn-primary btn-sm" id="cloudBannerBtn">Entrar novamente</button>`;
    main.prepend(div);
    document.getElementById('cloudBannerBtn').onclick = () => FF.logout();
  }

  document.addEventListener('ff:sync', (e) => {
    FF.renderCloudStatus();
    if (e.detail && e.detail.status === 'no-jwt') showReloginBanner();
    if (e.detail && e.detail.status === 'ok') {
      const b = document.getElementById('cloudBanner');
      if (b) b.remove();
    }
  });

  FF.renderLevelChip = () => {
    const chip = document.getElementById('levelChip');
    if (!chip) return;
    const li = FF.levelInfo();
    chip.innerHTML = `
      <div class="lvl-top">
        <span class="lvl-name">${FF.icon('zap', 13)} ${FF.t('level')} ${li.level}</span>
        <span class="lvl-xp">${li.xp} XP</span>
      </div>
      <div class="progress"><span style="width:${li.progress}%"></span></div>`;
  };

  /* ---------- topbar ---------- */
  FF.renderTopbar = (title, subtitle, actionsHTML = '') => {
    const el = document.getElementById('topbar');
    if (!el) return;
    el.className = 'topbar';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px">
        <button class="icon-btn menu-toggle" onclick="__ffToggleSidebar()" aria-label="Menu">${FF.icon('menu')}</button>
        <div class="page-title">
          <h1>${title}</h1>
          <p>${subtitle}</p>
        </div>
      </div>
      <div class="topbar-actions">
        ${actionsHTML}
        <button class="icon-btn" id="themeBtn" title="Alternar tema">${FF.icon(FF.state.settings.theme === 'dark' ? 'sun' : 'moon')}</button>
      </div>`;
    document.getElementById('themeBtn').onclick = FF.toggleTheme;
  };

  /* ---------- seletor de período ---------- */
  FF.periodSelectorHTML = () => {
    const cur = FF.state.settings.period || 'month';
    const opts = [['month', 'Mês'], ['quarter', '3 meses'], ['year', 'Ano'], ['all', 'Tudo']];
    return `<div class="segmented" id="periodSeg">
      ${opts.map(([k, l]) => `<button class="${cur === k ? 'active' : ''}" data-period="${k}">${l}</button>`).join('')}
    </div>`;
  };

  FF.bindPeriodSelector = (onChange) => {
    const seg = document.getElementById('periodSeg');
    if (!seg) return;
    seg.querySelectorAll('[data-period]').forEach(b => b.onclick = () => {
      FF.state.settings.period = b.dataset.period;
      FF.save();
      if (onChange) onChange(b.dataset.period);
      else location.reload();
    });
  };

  /* ---------- PWA: instalação e service worker ---------- */
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    bindInstallButton();
  });

  function bindInstallButton() {
    const btn = document.getElementById('installBtn');
    if (!btn || !deferredInstall) return;
    btn.style.display = '';
    btn.onclick = async () => {
      deferredInstall.prompt();
      const { outcome } = await deferredInstall.userChoice;
      if (outcome === 'accepted') { btn.style.display = 'none'; FF.toast('FinanceFlow instalado!', 'success'); }
      deferredInstall = null;
    };
  }

  FF.registerSW = (path = '../sw.js') => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(path).catch(() => { /* file:// ou http simples */ });
    // recarrega quando uma nova versão assume o controle (atualização em tempo real)
    let refreshed = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshed) return;
      refreshed = true;
      location.reload();
    });
  };

  /* ---------- Chart.js ---------- */
  FF.chartDefaults = () => {
    if (typeof Chart === 'undefined') return;
    const dark = FF.state.settings.theme === 'dark';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = dark ? '#9AA0B5' : '#6B7280';
    Chart.defaults.borderColor = dark ? '#23283F' : '#E5E7EB';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 7;
  };

  Object.defineProperty(FF, 'PALETTE', {
    get() {
      const ac = FF.ACCENTS[FF.state.settings.accent] || FF.ACCENTS.azul;
      return [ac.b, '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B'];
    },
  });
})(window.FF);

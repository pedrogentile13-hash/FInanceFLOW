/* ============================================================
   FinanceFlow · core/ui.js
   Tema, cor principal, sidebar, topbar, toast, modal,
   defaults do Chart.js e paleta.
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
  };

  FF.toggleTheme = () => {
    FF.state.settings.theme = FF.state.settings.theme === 'dark' ? 'light' : 'dark';
    FF.save();
    FF.applyTheme();
    const b = document.getElementById('themeBtn');
    if (b) b.textContent = FF.state.settings.theme === 'dark' ? '☀️' : '🌙';
    FF.chartDefaults();
    document.dispatchEvent(new CustomEvent('ff:theme'));
  };

  /* ---------- toast ---------- */
  FF.toast = (msg, kind = '', emoji = '💡') => {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<span class="t-emoji">${emoji}</span><span>${msg}</span>`;
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
          <button class="modal-close" aria-label="Fechar">✕</button>
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
      { href: 'dashboard.html', icon: '📊', nome: FF.t('dashboard') },
      { href: 'entradas.html', icon: '💵', nome: FF.t('in') },
      { href: 'saidas.html', icon: '💸', nome: FF.t('out') },
    ]},
    { label: FF.t('planning'), items: [
      { href: 'metas.html', icon: '🎯', nome: FF.t('goals') },
      { href: 'sonhos.html', icon: '✨', nome: FF.t('dreams') },
      { href: 'investimentos.html', icon: '📈', nome: FF.t('invest') },
      { href: 'projetos.html', icon: '🏗️', nome: FF.t('projects') },
    ]},
    { label: FF.t('intelligence'), items: [
      { href: 'estatisticas.html', icon: '📉', nome: FF.t('stats') },
      { href: 'ia-financeira.html', icon: '🤖', nome: FF.t('ai') },
      { href: 'simulador.html', icon: '🧮', nome: FF.t('sim') },
      { href: 'conquistas.html', icon: '🏆', nome: FF.t('achievements') },
    ]},
    { label: FF.t('system'), items: [
      { href: 'configuracoes.html', icon: '⚙️', nome: FF.t('settings') },
    ]},
  ];

  FF.renderSidebar = () => {
    const el = document.getElementById('sidebar');
    if (!el) return;
    const page = location.pathname.split('/').pop() || 'dashboard.html';
    const session = FF.session();
    el.className = 'sidebar';
    el.innerHTML = `
      <a class="brand" href="index.html">
        <span class="brand-mark">F</span>
        <span class="brand-name">Finance<span>Flow</span></span>
      </a>
      ${NAV().map(sec => `
        <div class="nav-section">
          <div class="nav-label">${sec.label}</div>
          ${sec.items.map(it => `
            <a class="nav-item ${page === it.href ? 'active' : ''}" href="${it.href}">
              <span>${it.icon}</span> ${it.nome}
            </a>`).join('')}
        </div>`).join('')}
      <div class="sidebar-footer">
        <div class="level-chip" id="levelChip"></div>
        <a class="user-chip" href="${session ? 'configuracoes.html' : 'login.html'}" id="userChip">
          <span class="uc-avatar">${session ? FF.esc((session.nome || session.email || '?').charAt(0).toUpperCase()) : '👤'}</span>
          <span class="uc-info">
            <b>${session ? FF.esc(session.nome || session.email) : FF.t('guest')}</b>
            <span>${session ? FF.esc(session.email || '') : FF.t('login')}</span>
          </span>
        </a>
        <button class="btn btn-ghost btn-sm" id="exportBtn" style="width:100%;margin-bottom:6px">⬇️ ${FF.t('export')}</button>
        <button class="btn btn-ghost btn-sm" id="importBtn" style="width:100%">⬆️ ${FF.t('import')}</button>
      </div>`;

    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
    backdrop.onclick = () => { el.classList.remove('open'); backdrop.classList.remove('show'); };
    window.__ffToggleSidebar = () => { el.classList.toggle('open'); backdrop.classList.toggle('show'); };

    FF.renderLevelChip();
    document.getElementById('exportBtn').onclick = FF.exportJSON;
    document.getElementById('importBtn').onclick = FF.importJSON;
  };

  FF.renderLevelChip = () => {
    const chip = document.getElementById('levelChip');
    if (!chip) return;
    const li = FF.levelInfo();
    chip.innerHTML = `
      <div class="lvl-top">
        <span class="lvl-name">⚡ ${FF.t('level')} ${li.level}</span>
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
        <button class="icon-btn menu-toggle" onclick="__ffToggleSidebar()" aria-label="Menu">☰</button>
        <div class="page-title">
          <h1>${title}</h1>
          <p>${subtitle}</p>
        </div>
      </div>
      <div class="topbar-actions">
        ${actionsHTML}
        <button class="icon-btn" id="themeBtn" title="Alternar tema">${FF.state.settings.theme === 'dark' ? '☀️' : '🌙'}</button>
      </div>`;
    document.getElementById('themeBtn').onclick = FF.toggleTheme;
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

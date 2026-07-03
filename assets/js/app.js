/* ============================================================
   FinanceFlow — Core (app.js)
   Storage, helpers, layout, tema, toasts, modal, gamificação
   ============================================================ */

const FF = (() => {
  const KEY = 'financeflow_v1';

  /* ---------- Estado padrão ---------- */
  const defaults = () => ({
    transactions: [],   // {id, type:'in'|'out', date, desc, category, value, method}
    metas: [],          // {id, nome, objetivo, atual, prazo, categoria, prioridade}
    sonhos: [],         // {id, nome, emoji, valor, acumulado}
    investimentos: [],  // {id, tipo, valor, data, rendimento, obs}
    projetos: [],       // {id, nome, status, obs, clientes, lancamentos:[{id,tipo,valor,desc,data}]}
    xp: 0,
    achievements: [],
    settings: { theme: 'light', nome: 'Investidor' },
    seeded: false,
  });

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { console.warn('FF load error', e); }
    return defaults();
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Formatação ---------- */
  const money = (v) => (v < 0 ? '-' : '') + 'R$ ' +
    Math.abs(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const dateBR = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const monthName = (i) => ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i];
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const pct = (v) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

  /* ---------- Cálculos financeiros ---------- */
  function totals(txs = state.transactions) {
    let inn = 0, out = 0;
    for (const t of txs) t.type === 'in' ? inn += t.value : out += t.value;
    return { in: inn, out, saldo: inn - out };
  }

  function txMonth(year, month) {
    return state.transactions.filter(t => {
      const d = new Date(t.date + 'T00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }

  function investTotal() {
    return state.investimentos.reduce((s, i) => s + i.value, 0);
  }

  function patrimonio() {
    return totals().saldo + investTotal();
  }

  function projTotals(p) {
    let rec = 0, cus = 0;
    for (const l of (p.lancamentos || [])) l.tipo === 'receita' ? rec += l.valor : cus += l.valor;
    return { receita: rec, custos: cus, lucro: rec - cus };
  }

  function byCategory(type) {
    const map = {};
    for (const t of state.transactions) {
      if (t.type !== type) continue;
      map[t.category] = (map[t.category] || 0) + t.value;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }

  /* ---------- Gamificação ---------- */
  const LEVELS = (() => {
    // Nível 1 = 0 XP, depois crescimento progressivo
    const arr = [0];
    let need = 100;
    for (let i = 1; i < 60; i++) { arr.push(arr[i - 1] + need); need = Math.round(need * 1.25); }
    return arr;
  })();

  function levelInfo() {
    const xp = state.xp;
    let lvl = 1;
    while (lvl < LEVELS.length && xp >= LEVELS[lvl]) lvl++;
    const base = LEVELS[lvl - 1];
    const next = LEVELS[lvl] ?? base + 1;
    return { level: lvl, xp, base, next, progress: Math.min(100, ((xp - base) / (next - base)) * 100) };
  }

  function addXP(amount, reason) {
    const before = levelInfo().level;
    state.xp += amount;
    save();
    toast(`+${amount} XP — ${reason}`, 'xp', '⚡');
    const after = levelInfo().level;
    if (after > before) toast(`Você subiu para o nível ${after}! 🎉`, 'success', '🏆');
    renderLevelChip();
    checkAchievements();
  }

  const ACHIEVEMENTS = [
    { id: 'first_tx',   emoji: '✍️', nome: 'Primeiro Registro', desc: 'Registre sua primeira movimentação', test: s => s.transactions.length >= 1 },
    { id: 'tx_50',      emoji: '📚', nome: 'Historiador', desc: 'Registre 50 movimentações', test: s => s.transactions.length >= 50 },
    { id: 'r100',       emoji: '💵', nome: 'Primeiros R$100', desc: 'Alcance R$100 de patrimônio', test: () => patrimonio() >= 100 },
    { id: 'r500',       emoji: '💰', nome: 'Primeiros R$500', desc: 'Alcance R$500 de patrimônio', test: () => patrimonio() >= 500 },
    { id: 'r1000',      emoji: '🤑', nome: 'Primeiros R$1.000', desc: 'Alcance R$1.000 de patrimônio', test: () => patrimonio() >= 1000 },
    { id: 'r5000',      emoji: '🏦', nome: 'Patrimônio R$5.000', desc: 'Alcance R$5.000 de patrimônio', test: () => patrimonio() >= 5000 },
    { id: 'first_meta', emoji: '🎯', nome: 'Primeira Meta', desc: 'Crie sua primeira meta', test: s => s.metas.length >= 1 },
    { id: 'meta_done',  emoji: '🏁', nome: 'Meta Concluída', desc: 'Complete 100% de uma meta', test: s => s.metas.some(m => m.atual >= m.objetivo && m.objetivo > 0) },
    { id: 'first_dream',emoji: '✨', nome: 'Sonhador', desc: 'Cadastre seu primeiro sonho', test: s => s.sonhos.length >= 1 },
    { id: 'dream_done', emoji: '🌟', nome: 'Sonho Realizado', desc: 'Complete 100% de um sonho', test: s => s.sonhos.some(d => d.acumulado >= d.valor && d.valor > 0) },
    { id: 'first_inv',  emoji: '📈', nome: 'Investidor Iniciante', desc: 'Faça seu primeiro investimento', test: s => s.investimentos.length >= 1 },
    { id: 'inv_1000',   emoji: '🚀', nome: 'Carteira Sólida', desc: 'Invista R$1.000 no total', test: () => investTotal() >= 1000 },
    { id: 'first_proj', emoji: '🏗️', nome: 'Empreendedor', desc: 'Crie seu primeiro projeto', test: s => s.projetos.length >= 1 },
    { id: 'proj_profit',emoji: '💼', nome: 'Primeira Venda', desc: 'Registre receita em um projeto', test: s => s.projetos.some(p => projTotals(p).receita > 0) },
    { id: 'save_streak',emoji: '🔥', nome: '7 Dias Economizando', desc: 'Fique 7 dias seguidos sem gastos', test: () => savingStreak() >= 7 },
    { id: 'save_30',    emoji: '🧊', nome: '30 Dias Economizando', desc: 'Fique 30 dias seguidos sem gastos', test: () => savingStreak() >= 30 },
    { id: 'lvl5',       emoji: '🥉', nome: 'Nível 5', desc: 'Alcance o nível 5', test: () => levelInfo().level >= 5 },
    { id: 'lvl10',      emoji: '🥈', nome: 'Nível 10', desc: 'Alcance o nível 10', test: () => levelInfo().level >= 10 },
    { id: 'lvl20',      emoji: '🥇', nome: 'Nível 20', desc: 'Alcance o nível 20', test: () => levelInfo().level >= 20 },
    { id: 'eco_month',  emoji: '🌱', nome: 'Mês no Verde', desc: 'Feche um mês com saldo positivo', test: () => {
        const now = new Date(); const t = totals(txMonth(now.getFullYear(), now.getMonth()));
        return t.in > 0 && t.saldo > 0;
      } },
  ];

  function savingStreak() {
    const outs = new Set(state.transactions.filter(t => t.type === 'out').map(t => t.date));
    if (!state.transactions.length) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const iso = d.toISOString().slice(0, 10);
      if (outs.has(iso)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function checkAchievements() {
    let unlocked = false;
    for (const a of ACHIEVEMENTS) {
      if (state.achievements.includes(a.id)) continue;
      try {
        if (a.test(state)) {
          state.achievements.push(a.id);
          unlocked = true;
          toast(`Conquista desbloqueada: ${a.nome}`, 'success', a.emoji);
          state.xp += 50;
        }
      } catch (e) { /* regra falhou, ignora */ }
    }
    if (unlocked) { save(); renderLevelChip(); }
  }

  /* ---------- Toast ---------- */
  function toast(msg, kind = '', emoji = '💡') {
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
  }

  /* ---------- Modal ---------- */
  function modal({ title, body, onSave, saveLabel = 'Salvar' }) {
    closeModal();
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
  }

  function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
  }

  function confirmDialog(msg, onYes) {
    modal({
      title: 'Confirmar',
      body: `<p class="muted" style="font-size:14px">${msg}</p>`,
      saveLabel: 'Confirmar',
      onSave: () => { onYes(); },
    });
  }

  /* ---------- Sidebar / layout ---------- */
  const NAV = [
    { label: 'Geral', items: [
      { href: 'dashboard.html', icon: '📊', nome: 'Dashboard' },
      { href: 'entradas.html', icon: '💵', nome: 'Entradas' },
      { href: 'saidas.html', icon: '💸', nome: 'Saídas' },
    ]},
    { label: 'Planejamento', items: [
      { href: 'metas.html', icon: '🎯', nome: 'Metas' },
      { href: 'sonhos.html', icon: '✨', nome: 'Sonhos' },
      { href: 'investimentos.html', icon: '📈', nome: 'Investimentos' },
      { href: 'projetos.html', icon: '🏗️', nome: 'Projetos' },
    ]},
    { label: 'Inteligência', items: [
      { href: 'estatisticas.html', icon: '📉', nome: 'Estatísticas' },
      { href: 'ia-financeira.html', icon: '🤖', nome: 'IA Financeira' },
      { href: 'simulador.html', icon: '🧮', nome: 'Simulador' },
      { href: 'conquistas.html', icon: '🏆', nome: 'Conquistas' },
    ]},
  ];

  function renderSidebar() {
    const el = document.getElementById('sidebar');
    if (!el) return;
    const page = location.pathname.split('/').pop() || 'dashboard.html';
    el.className = 'sidebar';
    el.innerHTML = `
      <a class="brand" href="index.html">
        <span class="brand-mark">F</span>
        <span class="brand-name">Finance<span>Flow</span></span>
      </a>
      ${NAV.map(sec => `
        <div class="nav-section">
          <div class="nav-label">${sec.label}</div>
          ${sec.items.map(it => `
            <a class="nav-item ${page === it.href ? 'active' : ''}" href="${it.href}">
              <span>${it.icon}</span> ${it.nome}
            </a>`).join('')}
        </div>`).join('')}
      <div class="sidebar-footer">
        <div class="level-chip" id="levelChip"></div>
        <button class="btn btn-ghost btn-sm" id="exportBtn" style="width:100%;margin-bottom:6px">⬇️ Exportar backup</button>
        <button class="btn btn-ghost btn-sm" id="importBtn" style="width:100%">⬆️ Importar backup</button>
      </div>`;

    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
    backdrop.onclick = () => { el.classList.remove('open'); backdrop.classList.remove('show'); };
    window.__ffToggleSidebar = () => { el.classList.toggle('open'); backdrop.classList.toggle('show'); };

    renderLevelChip();
    document.getElementById('exportBtn').onclick = exportJSON;
    document.getElementById('importBtn').onclick = importJSON;
  }

  function renderLevelChip() {
    const chip = document.getElementById('levelChip');
    if (!chip) return;
    const li = levelInfo();
    chip.innerHTML = `
      <div class="lvl-top">
        <span class="lvl-name">⚡ Nível ${li.level}</span>
        <span class="lvl-xp">${li.xp} XP</span>
      </div>
      <div class="progress"><span style="width:${li.progress}%"></span></div>`;
  }

  function renderTopbar(title, subtitle, actionsHTML = '') {
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
        <button class="icon-btn" id="themeBtn" title="Alternar tema">${state.settings.theme === 'dark' ? '☀️' : '🌙'}</button>
      </div>`;
    document.getElementById('themeBtn').onclick = toggleTheme;
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  }

  function toggleTheme() {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    save();
    applyTheme();
    const b = document.getElementById('themeBtn');
    if (b) b.textContent = state.settings.theme === 'dark' ? '☀️' : '🌙';
    document.dispatchEvent(new CustomEvent('ff:theme'));
  }

  /* ---------- Backup ---------- */
  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financeflow-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup exportado com sucesso', 'success', '📦');
  }

  function importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || !Array.isArray(data.transactions)) throw new Error('formato inválido');
          state = Object.assign(defaults(), data);
          save();
          toast('Backup importado! Recarregando…', 'success', '✅');
          setTimeout(() => location.reload(), 900);
        } catch (e) {
          toast('Arquivo de backup inválido', 'error', '⚠️');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /* ---------- Dados de demonstração ---------- */
  function seedDemo() {
    if (state.seeded || state.transactions.length) return;
    const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
    const catIn = ['Mesada', 'TCCFlow', 'LIDARA Digital', 'LIDARA Learning', 'Freelance', 'Presentes'];
    const catOut = ['Tecnologia', 'Alimentação', 'Transporte', 'Jogos', 'Streaming', 'Escola', 'Namoro'];
    const methods = ['Pix', 'Cartão', 'Dinheiro'];
    const now = new Date();
    for (let m = 5; m >= 0; m--) {
      const nIn = 3 + Math.floor(Math.random() * 3);
      const nOut = 6 + Math.floor(Math.random() * 5);
      for (let i = 0; i < nIn; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(Math.random() * 27));
        state.transactions.push({ id: uid(), type: 'in', date: d.toISOString().slice(0, 10),
          desc: catIn[i % catIn.length], category: catIn[Math.floor(Math.random() * catIn.length)],
          value: rnd(80, 600), method: methods[Math.floor(Math.random() * 3)] });
      }
      for (let i = 0; i < nOut; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(Math.random() * 27));
        state.transactions.push({ id: uid(), type: 'out', date: d.toISOString().slice(0, 10),
          desc: 'Compra ' + catOut[i % catOut.length], category: catOut[Math.floor(Math.random() * catOut.length)],
          value: rnd(15, 180), method: methods[Math.floor(Math.random() * 3)] });
      }
    }
    state.metas = [
      { id: uid(), nome: 'Hostinger', objetivo: 360, atual: 220, prazo: iso(60), categoria: 'Financeira', prioridade: 'Alta' },
      { id: uid(), nome: 'Samsung Buds', objetivo: 207, atual: 95, prazo: iso(45), categoria: 'Pessoal', prioridade: 'Média' },
      { id: uid(), nome: 'MacBook', objetivo: 8000, atual: 900, prazo: iso(400), categoria: 'Pessoal', prioridade: 'Alta' },
      { id: uid(), nome: 'Empresa própria', objetivo: 15000, atual: 1200, prazo: iso(720), categoria: 'Empresarial', prioridade: 'Alta' },
    ];
    state.sonhos = [
      { id: uid(), nome: 'Viagem China', emoji: '🇨🇳', valor: 12000, acumulado: 800 },
      { id: uid(), nome: 'MacBook', emoji: '💻', valor: 8000, acumulado: 900 },
      { id: uid(), nome: 'Empresa própria', emoji: '🏢', valor: 15000, acumulado: 1200 },
      { id: uid(), nome: 'Primeiro carro', emoji: '🚗', valor: 35000, acumulado: 500 },
      { id: uid(), nome: 'Setup dos sonhos', emoji: '🎮', valor: 6000, acumulado: 350 },
    ];
    state.investimentos = [
      { id: uid(), tipo: 'Caixa', value: 300, data: iso(-120), rendimento: 8, obs: 'Poupança' },
      { id: uid(), tipo: 'Nubank', value: 450, data: iso(-80), rendimento: 10.5, obs: 'Caixinha 100% CDI' },
      { id: uid(), tipo: 'CDB', value: 250, data: iso(-30), rendimento: 12, obs: 'CDB 110% CDI' },
    ];
    state.projetos = [
      { id: uid(), nome: 'TCCFlow', status: 'Ativo', obs: 'Plataforma de TCCs', clientes: 4, lancamentos: [
        { id: uid(), tipo: 'receita', valor: 350, desc: 'TCC completo', data: iso(-20) },
        { id: uid(), tipo: 'receita', valor: 280, desc: 'Revisão + formatação', data: iso(-9) },
        { id: uid(), tipo: 'custo', valor: 40, desc: 'Ferramentas', data: iso(-15) },
      ]},
      { id: uid(), nome: 'LIDARA Digital', status: 'Ativo', obs: 'Agência digital', clientes: 3, lancamentos: [
        { id: uid(), tipo: 'receita', valor: 500, desc: 'Site institucional', data: iso(-25) },
        { id: uid(), tipo: 'custo', valor: 60, desc: 'Domínio + hospedagem', data: iso(-25) },
      ]},
      { id: uid(), nome: 'LIDARA Learning', status: 'Planejamento', obs: 'Cursos online', clientes: 0, lancamentos: [] },
    ];
    state.xp = 340;
    state.seeded = true;
    save();
    checkAchievements();

    function iso(daysFromNow) {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      return d.toISOString().slice(0, 10);
    }
  }

  /* ---------- Chart.js defaults ---------- */
  function chartDefaults() {
    if (typeof Chart === 'undefined') return;
    const dark = state.settings.theme === 'dark';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = dark ? '#9AA0B5' : '#6B7280';
    Chart.defaults.borderColor = dark ? '#23283F' : '#E5E7EB';
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 7;
  }

  const PALETTE = ['#2E3BC9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B'];

  /* ---------- Init ---------- */
  function init({ title, subtitle, actions = '' } = {}) {
    applyTheme();
    seedDemo();
    renderSidebar();
    if (title) renderTopbar(title, subtitle, actions);
    chartDefaults();
    document.addEventListener('ff:theme', chartDefaults);
  }

  return {
    get state() { return state; },
    save, uid, money, dateBR, monthName, todayISO, pct,
    totals, txMonth, investTotal, patrimonio, projTotals, byCategory, savingStreak,
    LEVELS, levelInfo, addXP, ACHIEVEMENTS, checkAchievements,
    toast, modal, closeModal, confirmDialog,
    renderTopbar, applyTheme, toggleTheme, exportJSON, importJSON,
    chartDefaults, PALETTE, init,
  };
})();

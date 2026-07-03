/* ============================================================
   FinanceFlow · core/store.js
   Estado, persistência por perfil, categorias dinâmicas,
   seed de demonstração, backup e reset.
   ============================================================ */

(function (FF) {
  'use strict';

  const BASE_KEY = 'financeflow_v1';
  const SESSION_KEY = 'financeflow_session';

  /* ---------- categorias padrão (migradas de transacoes.js) ---------- */
  const DEFAULT_CATS = {
    in: [
      { id: 'c_mesada', nome: 'Mesada', icone: '👛', cor: '#22C55E' },
      { id: 'c_tccflow', nome: 'TCCFlow', icone: '🎓', cor: '#2E3BC9' },
      { id: 'c_lidara_d', nome: 'LIDARA Digital', icone: '🌐', cor: '#8B5CF6' },
      { id: 'c_lidara_l', nome: 'LIDARA Learning', icone: '📚', cor: '#06B6D4' },
      { id: 'c_presentes_in', nome: 'Presentes', icone: '🎁', cor: '#EC4899' },
      { id: 'c_freela', nome: 'Freelance', icone: '💼', cor: '#F59E0B' },
      { id: 'c_trabalho', nome: 'Trabalho', icone: '🏢', cor: '#64748B' },
      { id: 'c_outros_in', nome: 'Outros', icone: '📦', cor: '#84CC16' },
    ],
    out: [
      { id: 'c_tec', nome: 'Tecnologia', icone: '💻', cor: '#2E3BC9' },
      { id: 'c_escola', nome: 'Escola', icone: '🏫', cor: '#06B6D4' },
      { id: 'c_alim', nome: 'Alimentação', icone: '🍔', cor: '#F59E0B' },
      { id: 'c_transp', nome: 'Transporte', icone: '🚌', cor: '#64748B' },
      { id: 'c_jogos', nome: 'Jogos', icone: '🎮', cor: '#8B5CF6' },
      { id: 'c_stream', nome: 'Streaming', icone: '📺', cor: '#EF4444' },
      { id: 'c_presentes_out', nome: 'Presentes', icone: '🎁', cor: '#EC4899' },
      { id: 'c_namoro', nome: 'Namoro', icone: '❤️', cor: '#F43F5E' },
      { id: 'c_proj', nome: 'Projetos', icone: '🏗️', cor: '#22C55E' },
      { id: 'c_outros_out', nome: 'Outros', icone: '📦', cor: '#84CC16' },
    ],
  };

  const defaults = () => ({
    transactions: [],
    metas: [],
    sonhos: [],
    investimentos: [],
    projetos: [],
    categories: JSON.parse(JSON.stringify(DEFAULT_CATS)),
    xp: 0,
    achievements: [],
    settings: {
      theme: 'light', accent: 'azul', locale: 'pt-BR',
      currency: 'BRL', dateFormat: 'dmy', nome: 'Investidor',
    },
    seeded: false,
    lastModified: 0,
  });

  /* ---------- sessão / chave por perfil ---------- */
  FF.session = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
    catch (e) { return null; }
  };
  FF.setSession = (s) => {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  };
  FF.storageKey = () => {
    const s = FF.session();
    return s && s.userId ? `${BASE_KEY}:${s.userId}` : BASE_KEY;
  };

  /* ---------- migrações de versões antigas ---------- */
  function migrate(data) {
    const d = Object.assign(defaults(), data);
    // v0.9 salvava investimentos com a chave "valor"
    d.investimentos = (d.investimentos || []).map(i =>
      i.value === undefined && i.valor !== undefined ? { ...i, value: i.valor } : i);
    // v0.9 não tinha categorias dinâmicas nem os novos settings
    if (!d.categories || !d.categories.in) d.categories = JSON.parse(JSON.stringify(DEFAULT_CATS));
    d.settings = Object.assign(defaults().settings, d.settings);
    return d;
  }

  function load() {
    try {
      const raw = localStorage.getItem(FF.storageKey());
      if (raw) return migrate(JSON.parse(raw));
      // primeiro login de um usuário: herda os dados de visitante, se existirem
      if (FF.session()) {
        const guest = localStorage.getItem(BASE_KEY);
        if (guest) return migrate(JSON.parse(guest));
      }
    } catch (e) { console.warn('FF load error', e); }
    return defaults();
  }

  FF.state = load();

  const saveHooks = [];
  FF.onSave = (fn) => saveHooks.push(fn);

  FF.save = () => {
    FF.state.lastModified = Date.now();
    localStorage.setItem(FF.storageKey(), JSON.stringify(FF.state));
    for (const fn of saveHooks) { try { fn(FF.state); } catch (e) { /* hook não pode quebrar o save */ } }
  };

  FF.replaceState = (data) => {
    FF.state = migrate(data);
    localStorage.setItem(FF.storageKey(), JSON.stringify(FF.state));
  };

  FF.resetAll = () => {
    localStorage.removeItem(FF.storageKey());
    FF.state = defaults();
  };

  /* ---------- categorias dinâmicas ---------- */
  FF.categories = (type) => (FF.state.categories && FF.state.categories[type]) || DEFAULT_CATS[type];
  FF.categoryNames = (type) => FF.categories(type).map(c => c.nome);
  FF.categoryByName = (type, nome) => FF.categories(type).find(c => c.nome === nome) || null;
  FF.DEFAULT_CATS = DEFAULT_CATS;

  /* ---------- cálculos financeiros ---------- */
  FF.totals = (txs = FF.state.transactions) => {
    let inn = 0, out = 0;
    for (const t of txs) t.type === 'in' ? inn += t.value : out += t.value;
    return { in: inn, out, saldo: inn - out };
  };

  FF.txMonth = (year, month) => FF.state.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  FF.investTotal = () => FF.state.investimentos.reduce((s, i) => s + (Number(i.value) || 0), 0);

  FF.patrimonio = () => FF.totals().saldo + FF.investTotal();

  FF.projTotals = (p) => {
    let rec = 0, cus = 0;
    for (const l of (p.lancamentos || [])) l.tipo === 'receita' ? rec += l.valor : cus += l.valor;
    return { receita: rec, custos: cus, lucro: rec - cus };
  };

  FF.byCategory = (type) => {
    const map = {};
    for (const t of FF.state.transactions) {
      if (t.type !== type) continue;
      map[t.category] = (map[t.category] || 0) + t.value;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  /* ---------- backup ---------- */
  FF.exportJSON = () => {
    const blob = new Blob([JSON.stringify(FF.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financeflow-backup-${FF.todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    FF.toast('Backup exportado com sucesso', 'success', '📦');
  };

  FF.importJSON = () => {
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
          FF.replaceState(data);
          FF.save();
          FF.toast('Backup importado! Recarregando…', 'success', '✅');
          setTimeout(() => location.reload(), 900);
        } catch (e) {
          FF.toast('Arquivo de backup inválido', 'error', '⚠️');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /* ---------- dados de demonstração ---------- */
  FF.seedDemo = () => {
    const state = FF.state;
    if (state.seeded || state.transactions.length) return;
    const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) * 100) / 100;
    const catIn = FF.categoryNames('in');
    const catOut = FF.categoryNames('out');
    const methods = ['Pix', 'Cartão', 'Dinheiro'];
    const now = new Date();
    for (let m = 5; m >= 0; m--) {
      const nIn = 3 + Math.floor(Math.random() * 3);
      const nOut = 6 + Math.floor(Math.random() * 5);
      for (let i = 0; i < nIn; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(Math.random() * 27));
        state.transactions.push({ id: FF.uid(), type: 'in', date: d.toISOString().slice(0, 10),
          desc: catIn[i % catIn.length], category: catIn[Math.floor(Math.random() * catIn.length)],
          value: rnd(80, 600), method: methods[Math.floor(Math.random() * 3)] });
      }
      for (let i = 0; i < nOut; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - m, 1 + Math.floor(Math.random() * 27));
        state.transactions.push({ id: FF.uid(), type: 'out', date: d.toISOString().slice(0, 10),
          desc: 'Compra ' + catOut[i % catOut.length], category: catOut[Math.floor(Math.random() * catOut.length)],
          value: rnd(15, 180), method: methods[Math.floor(Math.random() * 3)] });
      }
    }
    const iso = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
    state.metas = [
      { id: FF.uid(), nome: 'Hostinger', objetivo: 360, atual: 220, prazo: iso(60), categoria: 'Financeira', prioridade: 'Alta' },
      { id: FF.uid(), nome: 'Samsung Buds', objetivo: 207, atual: 95, prazo: iso(45), categoria: 'Pessoal', prioridade: 'Média' },
      { id: FF.uid(), nome: 'MacBook', objetivo: 8000, atual: 900, prazo: iso(400), categoria: 'Pessoal', prioridade: 'Alta' },
      { id: FF.uid(), nome: 'Empresa própria', objetivo: 15000, atual: 1200, prazo: iso(720), categoria: 'Empresarial', prioridade: 'Alta' },
    ];
    state.sonhos = [
      { id: FF.uid(), nome: 'Viagem China', emoji: '🇨🇳', valor: 12000, acumulado: 800 },
      { id: FF.uid(), nome: 'MacBook', emoji: '💻', valor: 8000, acumulado: 900 },
      { id: FF.uid(), nome: 'Empresa própria', emoji: '🏢', valor: 15000, acumulado: 1200 },
      { id: FF.uid(), nome: 'Primeiro carro', emoji: '🚗', valor: 35000, acumulado: 500 },
      { id: FF.uid(), nome: 'Setup dos sonhos', emoji: '🎮', valor: 6000, acumulado: 350 },
    ];
    state.investimentos = [
      { id: FF.uid(), tipo: 'Caixa', value: 300, data: iso(-120), rendimento: 8, obs: 'Poupança' },
      { id: FF.uid(), tipo: 'Nubank', value: 450, data: iso(-80), rendimento: 10.5, obs: 'Caixinha 100% CDI' },
      { id: FF.uid(), tipo: 'CDB', value: 250, data: iso(-30), rendimento: 12, obs: 'CDB 110% CDI' },
    ];
    state.projetos = [
      { id: FF.uid(), nome: 'TCCFlow', status: 'Ativo', obs: 'Plataforma de TCCs', clientes: 4, lancamentos: [
        { id: FF.uid(), tipo: 'receita', valor: 350, desc: 'TCC completo', data: iso(-20) },
        { id: FF.uid(), tipo: 'receita', valor: 280, desc: 'Revisão + formatação', data: iso(-9) },
        { id: FF.uid(), tipo: 'custo', valor: 40, desc: 'Ferramentas', data: iso(-15) },
      ]},
      { id: FF.uid(), nome: 'LIDARA Digital', status: 'Ativo', obs: 'Agência digital', clientes: 3, lancamentos: [
        { id: FF.uid(), tipo: 'receita', valor: 500, desc: 'Site institucional', data: iso(-25) },
        { id: FF.uid(), tipo: 'custo', valor: 60, desc: 'Domínio + hospedagem', data: iso(-25) },
      ]},
      { id: FF.uid(), nome: 'LIDARA Learning', status: 'Planejamento', obs: 'Cursos online', clientes: 0, lancamentos: [] },
    ];
    state.xp = 340;
    state.seeded = true;
    FF.save();
  };
})(window.FF);

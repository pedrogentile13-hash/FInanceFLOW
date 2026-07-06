/* ============================================================
   FinanceFlow · core/sync.js
   Sincronização em nuvem via Supabase — uma tabela por tipo de
   dado (transactions, goals, dreams, investments, projects,
   project_entries, categories, user_settings). Ver supabase/schema.sql.

   Estratégia: o app continua 100% local-first (todo mundo lê/
   escreve em FF.state normalmente, sem saber que existe nuvem).
   Este módulo compara FF.state com o último snapshot conhecido
   da nuvem (lastSynced) a cada FF.save(), e envia só a diferença
   como upserts/deletes por linha — sem precisar tocar em nenhuma
   outra página do app.

   · pull no login: se a nuvem tiver dados, adota; se estiver
     vazia (conta nova), mantém o estado local (vazio) como está
   · push com debounce a cada FF.save(), por diff linha a linha
   · realtime: mudanças de outro dispositivo disparam um refresh
   Sem Supabase configurado ou sem login, nada é executado —
   o app permanece 100% local.
   ============================================================ */

(function (FF) {
  'use strict';

  let pushTimer = null;
  let refreshTimer = null;
  let applyingRemote = false;
  let lastSynced = null; // último estado conhecido como "igual à nuvem"
  let lastPushAt = 0;

  function canSync() {
    const s = FF.session();
    return !!(FF.supabaseConfig() && s && s.provider === 'supabase' && FF.supabase());
  }

  /* ---------- achatamento do estado em listas por tabela ---------- */
  const flattenCategories = (cats) => [
    ...((cats && cats.in) || []).map(c => ({ ...c, type: 'in' })),
    ...((cats && cats.out) || []).map(c => ({ ...c, type: 'out' })),
  ];
  const flattenEntries = (projetos) =>
    (projetos || []).flatMap(p => (p.lancamentos || []).map(l => ({ ...l, project_id: p.id })));

  function snapshot(state) {
    state = state || {};
    return {
      transactions: state.transactions || [],
      goals: state.metas || [],
      dreams: state.sonhos || [],
      investments: state.investimentos || [],
      categories: flattenCategories(state.categories),
      projects: (state.projetos || []).map(({ lancamentos, ...p }) => p),
      entries: flattenEntries(state.projetos),
      userSettings: {
        xp: state.xp || 0,
        achievements: state.achievements || [],
        settings: state.settings || {},
        seeded: !!state.seeded,
      },
    };
  }

  /* ---------- conversão linha <-> objeto do app ---------- */
  function rowMappers(uid) {
    return {
      transactions: t => ({ id: t.id, user_id: uid, type: t.type, date: t.date, descricao: t.desc, category: t.category, value: t.value, method: t.method }),
      goals: m => ({ id: m.id, user_id: uid, nome: m.nome, objetivo: m.objetivo, atual: m.atual, prazo: m.prazo || null, categoria: m.categoria, prioridade: m.prioridade }),
      dreams: d => ({ id: d.id, user_id: uid, nome: d.nome, emoji: d.emoji, valor: d.valor, acumulado: d.acumulado }),
      investments: i => ({ id: i.id, user_id: uid, tipo: i.tipo, value: i.value, data: i.data || null, rendimento: i.rendimento, obs: i.obs }),
      categories: c => ({ id: c.id, user_id: uid, type: c.type, nome: c.nome, icone: c.icone, cor: c.cor }),
      projects: p => ({ id: p.id, user_id: uid, nome: p.nome, status: p.status, obs: p.obs, clientes: p.clientes }),
      entries: e => ({ id: e.id, user_id: uid, project_id: e.project_id, tipo: e.tipo, valor: e.valor, descricao: e.desc, data: e.data || null }),
    };
  }

  const fromRow = {
    transactions: r => ({ id: r.id, type: r.type, date: r.date, desc: r.descricao, category: r.category, value: Number(r.value), method: r.method }),
    goals: r => ({ id: r.id, nome: r.nome, objetivo: Number(r.objetivo), atual: Number(r.atual), prazo: r.prazo || '', categoria: r.categoria, prioridade: r.prioridade }),
    dreams: r => ({ id: r.id, nome: r.nome, emoji: r.emoji, valor: Number(r.valor), acumulado: Number(r.acumulado) }),
    investments: r => ({ id: r.id, tipo: r.tipo, value: Number(r.value), data: r.data || '', rendimento: r.rendimento == null ? 0 : Number(r.rendimento), obs: r.obs }),
  };

  /* ---------- diff genérico por tabela (upsert do que mudou, delete do que sumiu) ---------- */
  function diffRows(current, previous) {
    const prevById = new Map(previous.map(r => [r.id, r]));
    const curById = new Map(current.map(r => [r.id, r]));
    const upserts = current.filter(r => {
      const prev = prevById.get(r.id);
      return !prev || JSON.stringify(prev) !== JSON.stringify(r);
    });
    const deletes = previous.filter(r => !curById.has(r.id)).map(r => r.id);
    return { upserts, deletes };
  }

  async function syncTable(sb, table, current, previous, toRow) {
    const { upserts, deletes } = diffRows(current, previous);
    if (upserts.length) {
      const { error } = await sb.from(table).upsert(upserts.map(toRow));
      if (error) console.warn(`FF sync push ${table}`, error.message);
    }
    if (deletes.length) {
      const { error } = await sb.from(table).delete().in('id', deletes);
      if (error) console.warn(`FF sync delete ${table}`, error.message);
    }
  }

  async function push() {
    if (!canSync() || applyingRemote) return;
    const sb = FF.supabase();
    const s = FF.session();
    const map = rowMappers(s.userId);
    const cur = snapshot(FF.state);
    const prev = snapshot(lastSynced);

    await syncTable(sb, 'transactions', cur.transactions, prev.transactions, map.transactions);
    await syncTable(sb, 'goals', cur.goals, prev.goals, map.goals);
    await syncTable(sb, 'dreams', cur.dreams, prev.dreams, map.dreams);
    await syncTable(sb, 'investments', cur.investments, prev.investments, map.investments);
    await syncTable(sb, 'categories', cur.categories, prev.categories, map.categories);
    await syncTable(sb, 'projects', cur.projects, prev.projects, map.projects);
    await syncTable(sb, 'project_entries', cur.entries, prev.entries, map.entries);

    if (JSON.stringify(cur.userSettings) !== JSON.stringify(prev.userSettings)) {
      const { error } = await sb.from('user_settings').upsert({
        user_id: s.userId,
        xp: cur.userSettings.xp,
        achievements: cur.userSettings.achievements,
        settings: cur.userSettings.settings,
        seeded: cur.userSettings.seeded,
        updated_at: new Date().toISOString(),
      });
      if (error) console.warn('FF sync push user_settings', error.message);
    }

    lastSynced = JSON.parse(JSON.stringify(FF.state));
    lastPushAt = Date.now();
  }

  function schedulePush() {
    if (!canSync()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 2000);
  }

  // envia o estado atual pra nuvem imediatamente, sem esperar o debounce
  // (usado pelo reset: sem isso, o próximo pull ressuscitaria os dados antigos)
  FF.forcePushNow = async () => {
    clearTimeout(pushTimer);
    await push();
  };

  async function pull() {
    if (!canSync()) return;
    const sb = FF.supabase();
    const s = FF.session();
    const uid = s.userId;

    const [tx, goals, dreams, inv, cats, projs, entries, settingsRow] = await Promise.all([
      sb.from('transactions').select('*').eq('user_id', uid),
      sb.from('goals').select('*').eq('user_id', uid),
      sb.from('dreams').select('*').eq('user_id', uid),
      sb.from('investments').select('*').eq('user_id', uid),
      sb.from('categories').select('*').eq('user_id', uid),
      sb.from('projects').select('*').eq('user_id', uid),
      sb.from('project_entries').select('*').eq('user_id', uid),
      sb.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
    ]);
    const results = [tx, goals, dreams, inv, cats, projs, entries, settingsRow];
    const failed = results.find(r => r.error);
    if (failed) { console.warn('FF sync pull', failed.error.message); return; }

    const hasRemoteData = [tx, goals, dreams, inv, cats, projs].some(r => r.data && r.data.length) || !!settingsRow.data;
    if (!hasRemoteData) {
      // conta nova: nada na nuvem ainda — mantém o estado local (zerado) como está
      lastSynced = JSON.parse(JSON.stringify(FF.state));
      return;
    }

    const catsIn = (cats.data || []).filter(c => c.type === 'in').map(c => ({ id: c.id, nome: c.nome, icone: c.icone, cor: c.cor }));
    const catsOut = (cats.data || []).filter(c => c.type === 'out').map(c => ({ id: c.id, nome: c.nome, icone: c.icone, cor: c.cor }));

    const assembled = {
      transactions: (tx.data || []).map(fromRow.transactions),
      metas: (goals.data || []).map(fromRow.goals),
      sonhos: (dreams.data || []).map(fromRow.dreams),
      investimentos: (inv.data || []).map(fromRow.investments),
      categories: (catsIn.length || catsOut.length) ? { in: catsIn, out: catsOut } : FF.state.categories,
      projetos: (projs.data || []).map(p => ({
        id: p.id, nome: p.nome, status: p.status, obs: p.obs, clientes: p.clientes,
        lancamentos: (entries.data || []).filter(e => e.project_id === p.id)
          .map(e => ({ id: e.id, tipo: e.tipo, valor: Number(e.valor), desc: e.descricao, data: e.data || '' })),
      })),
      xp: settingsRow.data ? settingsRow.data.xp : FF.state.xp,
      achievements: settingsRow.data ? settingsRow.data.achievements : FF.state.achievements,
      settings: Object.assign({}, FF.state.settings, settingsRow.data ? settingsRow.data.settings : {}),
      seeded: settingsRow.data ? settingsRow.data.seeded : FF.state.seeded,
      lastModified: Date.now(),
    };

    applyingRemote = true;
    FF.replaceState(Object.assign({}, FF.state, assembled));
    applyingRemote = false;
    lastSynced = JSON.parse(JSON.stringify(FF.state));
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      await pull();
      FF.toast('Dados sincronizados de outro dispositivo. Atualizando…', 'success');
      setTimeout(() => location.reload(), 800);
    }, 500);
  }

  const SYNCED_TABLES = ['transactions', 'goals', 'dreams', 'investments', 'categories', 'projects', 'project_entries', 'user_settings'];

  function subscribe() {
    if (!canSync()) return;
    const sb = FF.supabase();
    const s = FF.session();
    const channel = sb.channel('ff-sync');
    for (const table of SYNCED_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${s.userId}` }, () => {
        if (applyingRemote) return;
        if (Date.now() - lastPushAt < 3000) return; // provável eco do nosso próprio push
        scheduleRefresh();
      });
    }
    channel.subscribe();
  }

  FF.initSync = async () => {
    // só carrega o SDK (~200KB) quando existe de fato uma sessão
    // Supabase ativa — visitantes e contas locais nunca pagam esse custo,
    // mesmo com o projeto padrão configurado para todo mundo.
    const s = FF.session();
    if (!FF.supabaseConfig() || !s || s.provider !== 'supabase') return;
    await FF.loadSupabaseSDK();
    if (!canSync()) return;
    FF.onSave(schedulePush);
    await pull();
    subscribe();
  };

  FF.syncStatus = () => {
    if (!FF.supabaseConfig()) return 'off';
    const s = FF.session();
    if (!s || s.provider !== 'supabase') return 'logged-out';
    return 'on';
  };
})(window.FF);

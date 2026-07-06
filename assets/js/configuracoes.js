/* ============================================================
   FinanceFlow — Configurações
   Perfil · Personalização · Categorias · Sistema · Nuvem
   ============================================================ */

(() => {
  FF.init({
    title: 'Configurações',
    subtitle: 'A central de controle do seu FinanceFlow',
  });

  const S = FF.state.settings;

  /* ================= Navegação lateral (janela única) ================= */
  const PANELS = [
    ['perfil', 'user', 'Perfil'],
    ['aparencia', 'settings', 'Aparência'],
    ['categorias', 'tag', 'Categorias'],
    ['sistema', 'database', 'Sistema'],
    ['nuvem', 'cloud', 'Nuvem'],
  ];
  const nav = document.getElementById('settingsNav');
  nav.innerHTML = PANELS.map(([id, ic, label]) =>
    `<button data-goto="${id}">${FF.icon(ic, 16)} <span>${label}</span></button>`).join('');

  function showPanel(id) {
    document.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== id);
    nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.goto === id));
    history.replaceState(null, '', '#' + id);
  }
  nav.querySelectorAll('button').forEach(b => b.onclick = () => showPanel(b.dataset.goto));
  showPanel(['perfil', 'aparencia', 'categorias', 'sistema', 'nuvem'].includes(location.hash.slice(1))
    ? location.hash.slice(1) : 'perfil');

  /* ================= Perfil ================= */
  function renderProfile() {
    const session = FF.session();
    const box = document.getElementById('profileBox');
    if (session) {
      box.innerHTML = `
        <div class="list-item" style="border:none;padding-top:0">
          <span class="uc-avatar" style="width:44px;height:44px;font-size:17px">${FF.esc((session.nome || session.email || '?').charAt(0).toUpperCase())}</span>
          <div class="li-main">
            <b>${FF.esc(session.nome || '—')}</b>
            <span>${FF.esc(session.email || '')} · conta ${session.provider === 'supabase' ? 'em nuvem' : 'local'}</span>
          </div>
        </div>
        <div class="form-grid mt-8">
          <div class="field"><label>Nome de exibição</label>
            <input id="profNome" value="${FF.esc(session.nome || '')}"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" id="btnSaveProfile">Salvar perfil</button>
          <button class="btn btn-danger btn-sm" id="btnLogout">Sair da conta</button>
        </div>`;
      document.getElementById('btnSaveProfile').onclick = () => {
        const nome = document.getElementById('profNome').value.trim();
        if (!nome) return FF.toast('Informe um nome', 'error', '⚠️');
        FF.updateProfile({ nome });
        FF.toast('Perfil atualizado', 'success', '✅');
        FF.renderSidebar();
      };
      document.getElementById('btnLogout').onclick = () =>
        FF.confirmDialog('Sair da conta? Seus dados continuam salvos neste perfil.', FF.logout);
    } else {
      box.innerHTML = `
        <p class="muted" style="margin-bottom:14px">Você está usando o FinanceFlow como <b>visitante</b>.
        Crie uma conta para proteger seus dados com senha e habilitar a sincronização em nuvem.</p>
        <a class="btn btn-primary btn-sm" href="../index.html#conta">Entrar / Criar conta</a>`;
    }
  }
  renderProfile();

  /* ================= Personalização ================= */
  const bind = (id, key, after) => {
    const el = document.getElementById(id);
    el.value = S[key];
    el.onchange = () => {
      S[key] = el.value;
      FF.save();
      if (after) after();
      FF.toast('Preferência salva', 'success', '✅');
    };
  };
  bind('setTheme', 'theme', () => { FF.applyTheme(); FF.chartDefaults(); });
  bind('setLocale', 'locale', () => { FF.renderSidebar(); });
  bind('setCurrency', 'currency');
  bind('setDateFormat', 'dateFormat');
  bind('setPeriod', 'period');

  function renderSwatches() {
    const wrap = document.getElementById('accentSwatches');
    wrap.innerHTML = Object.entries(FF.ACCENTS).map(([key, ac]) => `
      <div class="accent-swatch ${S.accent === key ? 'active' : ''}" data-accent="${key}"
        title="${ac.nome}" style="background:linear-gradient(135deg,${ac.a},${ac.b})"></div>`).join('');
    wrap.querySelectorAll('[data-accent]').forEach(sw => sw.onclick = () => {
      S.accent = sw.dataset.accent;
      FF.save();
      FF.applyTheme();
      renderSwatches();
      FF.toast(`Cor "${FF.ACCENTS[S.accent].nome}" aplicada`, 'success', '🎨');
    });
  }
  renderSwatches();

  /* ================= Categorias ================= */
  const EMOJI_OPTS = ['💵', '💸', '💻', '🍔', '🚌', '🎮', '📺', '🎁', '❤️', '🏫', '🏗️', '📦', '👛', '🎓', '🌐', '📚', '💼', '🏢', '✈️', '⚽', '💊', '🐶', '🛒', '☕'];
  const COLOR_OPTS = ['#2E3BC9', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#64748B', '#F43F5E', '#059669'];

  function renderCats() {
    for (const type of ['in', 'out']) {
      const el = document.getElementById(type === 'in' ? 'catsIn' : 'catsOut');
      const cats = FF.categories(type);
      el.innerHTML = cats.map(c => `
        <div class="cat-item">
          <span class="cat-icon" style="background:color-mix(in srgb, ${c.cor} 14%, transparent)">${c.icone}</span>
          <b>${FF.esc(c.nome)}</b>
          <span class="cat-dot" style="background:${c.cor}"></span>
          <button class="row-btn" data-edit="${type}:${c.id}" title="Editar">${FF.icon('pencil', 14)}</button>
          <button class="row-btn del" data-del="${type}:${c.id}" title="Excluir">${FF.icon('trash', 14)}</button>
        </div>`).join('') || '<div class="empty"><div class="e-icon">🏷️</div><h4>Nenhuma categoria</h4></div>';
    }
    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => {
      const [type, id] = b.dataset.edit.split(':');
      openCatForm(type, id);
    });
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const [type, id] = b.dataset.del.split(':');
      const cat = FF.categories(type).find(c => c.id === id);
      const usadas = FF.state.transactions.filter(t => t.type === type && t.category === cat.nome).length;
      FF.confirmDialog(
        usadas
          ? `A categoria "${FF.esc(cat.nome)}" está em ${usadas} lançamento(s), que passarão para "Outros". Excluir mesmo assim?`
          : `Excluir a categoria "${FF.esc(cat.nome)}"?`,
        () => {
          for (const t of FF.state.transactions) {
            if (t.type === type && t.category === cat.nome) t.category = 'Outros';
          }
          FF.state.categories[type] = FF.state.categories[type].filter(c => c.id !== id);
          FF.save();
          FF.toast('Categoria excluída', '', '🗑️');
          renderCats();
        });
    });
  }

  function openCatForm(type, id) {
    const cat = id ? FF.categories(type).find(c => c.id === id) : null;
    FF.modal({
      title: cat ? 'Editar categoria' : `Nova categoria de ${type === 'in' ? 'entrada' : 'saída'}`,
      body: `
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1"><label>Nome</label>
            <input id="catNome" value="${cat ? FF.esc(cat.nome) : ''}" placeholder="Ex: Delivery"></div>
          <div class="field"><label>Ícone</label>
            <select id="catIcone">${EMOJI_OPTS.map(e => `<option ${cat && cat.icone === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
          <div class="field"><label>Cor</label>
            <select id="catCor">${COLOR_OPTS.map(c => `<option value="${c}" ${cat && cat.cor === c ? 'selected' : ''} style="background:${c};color:#fff">${c}</option>`).join('')}</select></div>
        </div>`,
      onSave: (ov) => {
        const nome = ov.querySelector('#catNome').value.trim();
        if (!nome) { FF.toast('Informe o nome da categoria', 'error', '⚠️'); return false; }
        const dup = FF.categories(type).some(c => c.nome.toLowerCase() === nome.toLowerCase() && (!cat || c.id !== cat.id));
        if (dup) { FF.toast('Já existe uma categoria com esse nome', 'error', '⚠️'); return false; }
        const payload = { nome, icone: ov.querySelector('#catIcone').value, cor: ov.querySelector('#catCor').value };
        if (cat) {
          // renomear categoria propaga aos lançamentos existentes
          if (cat.nome !== nome) {
            for (const t of FF.state.transactions) {
              if (t.type === type && t.category === cat.nome) t.category = nome;
            }
          }
          Object.assign(cat, payload);
          FF.toast('Categoria atualizada', 'success', '✅');
        } else {
          FF.state.categories[type].push({ id: FF.uid(), ...payload });
          FF.toast('Categoria criada', 'success', '🏷️');
        }
        FF.save();
        renderCats();
      },
    });
  }

  document.getElementById('btnNewCatIn').onclick = () => openCatForm('in');
  document.getElementById('btnNewCatOut').onclick = () => openCatForm('out');
  renderCats();

  /* ================= Sistema ================= */
  const installBtn = document.getElementById('btnInstallCfg');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installBtn.disabled = false;
    installBtn.textContent = 'Instalar agora';
    installBtn.onclick = async () => {
      e.prompt();
      const { outcome } = await e.userChoice;
      if (outcome === 'accepted') { installBtn.textContent = 'Instalado'; installBtn.disabled = true; }
    };
  });

  document.getElementById('btnExport').onclick = FF.exportJSON;
  document.getElementById('btnImport').onclick = FF.importJSON;
  document.getElementById('btnReset').onclick = () =>
    FF.confirmDialog('Isto apaga TODOS os dados deste perfil (lançamentos, metas, sonhos, projetos, XP). Não há como desfazer. Continuar?', () => {
      FF.resetAll();
      FF.toast('Sistema resetado. Recarregando…', 'success', '🧹');
      setTimeout(() => location.reload(), 900);
    });

  /* ================= Nuvem (Supabase) ================= */
  (() => {
    const cfg = FF.supabaseConfig(); // nunca null: cai no padrão do FinanceFlow
    const badge = document.getElementById('syncBadge');
    const sub = document.getElementById('cloudSub');
    document.getElementById('sbUrl').value = cfg ? cfg.url : '';
    document.getElementById('sbKey').value = cfg ? cfg.anonKey : '';

    if (!cfg) {
      badge.textContent = 'desativada';
      badge.className = 'badge gray';
    } else if (FF.isDefaultSupabase()) {
      const st = FF.syncStatus();
      badge.textContent = st === 'on' ? 'Sincronizado (padrão)' : 'Padrão FinanceFlow — faça login para sincronizar';
      badge.className = 'badge ' + (st === 'on' ? 'green' : 'amber');
      sub.innerHTML = 'Você está usando o projeto Supabase padrão do FinanceFlow. Crie sua conta em ' +
        '<b>Entrar / Criar conta</b> (aba Perfil) para sincronizar seus dados entre dispositivos.';
    } else {
      const st = FF.syncStatus();
      badge.textContent = st === 'on' ? 'Sincronizado (projeto próprio)' : 'Projeto próprio — faça login para sincronizar';
      badge.className = 'badge ' + (st === 'on' ? 'green' : 'amber');
      sub.textContent = 'Conectado ao seu próprio projeto Supabase. Lembre-se de rodar supabase/schema.sql nele.';
    }

    document.getElementById('btnSbSave').onclick = () => {
      const url = document.getElementById('sbUrl').value.trim();
      const key = document.getElementById('sbKey').value.trim();
      if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url) || key.length < 20) {
        return FF.toast('Verifique a URL e a anon key do Supabase', 'error', '⚠️');
      }
      FF.setSupabaseConfig({ url: url.replace(/\/$/, ''), anonKey: key });
      FF.toast('Projeto Supabase próprio conectado! Entre novamente para sincronizar.', 'success', '☁️');
      setTimeout(() => location.reload(), 1200);
    };
    document.getElementById('btnSbDefault').onclick = () =>
      FF.confirmDialog('Voltar a usar o projeto Supabase padrão do FinanceFlow?', () => {
        FF.useDefaultSupabase();
        FF.toast('Voltando ao padrão do FinanceFlow', 'success', '☁️');
        setTimeout(() => location.reload(), 900);
      });
    document.getElementById('btnSbClear').onclick = () =>
      FF.confirmDialog('Desativar a nuvem? O app volta a funcionar apenas neste dispositivo.', () => {
        FF.setSupabaseConfig(null);
        FF.toast('Nuvem desativada — modo local', '', '🔌');
        setTimeout(() => location.reload(), 900);
      });
  })();
})();

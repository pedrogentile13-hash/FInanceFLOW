/* ============================================================
   FinanceFlow — Metas
   ============================================================ */

(() => {
  FF.init({
    title: 'Metas',
    subtitle: 'Objetivos claros, progresso visível',
    actions: `<button class="btn btn-primary" id="newMeta">＋ Nova meta</button>`,
  });
  document.getElementById('newMeta').onclick = () => openForm();

  const PRIOS = ['Alta', 'Média', 'Baixa'];
  const CATS = ['Financeira', 'Pessoal', 'Empresarial'];

  function daysLeft(prazo) {
    if (!prazo) return null;
    return Math.ceil((new Date(prazo + 'T00:00') - new Date()) / 86400000);
  }

  function render() {
    const metas = [...FF.state.metas].sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'));
    const done = metas.filter(m => m.atual >= m.objetivo).length;
    const totalObj = metas.reduce((s, m) => s + m.objetivo, 0);
    const totalAtual = metas.reduce((s, m) => s + Math.min(m.atual, m.objetivo), 0);

    document.getElementById('kpis').innerHTML = `
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Metas ativas</span><span class="kpi-icon">🎯</span></div>
        <div class="kpi-value">${metas.length - done}</div><div class="kpi-sub">${done} concluídas</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Total planejado</span><span class="kpi-icon amber">🗺️</span></div>
        <div class="kpi-value">${FF.money(totalObj)}</div><div class="kpi-sub">Somatório dos objetivos</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Já acumulado</span><span class="kpi-icon green">💰</span></div>
        <div class="kpi-value">${FF.money(totalAtual)}</div>
        <div class="kpi-sub">${totalObj ? FF.pct((totalAtual / totalObj) * 100) : '0%'} do caminho</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Falta conquistar</span><span class="kpi-icon red">⛰️</span></div>
        <div class="kpi-value">${FF.money(Math.max(0, totalObj - totalAtual))}</div><div class="kpi-sub">Continue avançando</div></div>`;

    const grid = document.getElementById('metasGrid');
    if (!metas.length) {
      grid.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty">
        <div class="e-icon">🎯</div><h4>Nenhuma meta ainda</h4><p>Toda grande conquista começa com uma meta clara.</p></div></div>`;
      return;
    }

    grid.innerHTML = metas.map(m => {
      const p = m.objetivo > 0 ? Math.min(100, (m.atual / m.objetivo) * 100) : 0;
      const dl = daysLeft(m.prazo);
      const completa = m.atual >= m.objetivo;
      const status = completa
        ? '<span class="badge green">✔ Concluída</span>'
        : dl !== null && dl < 0
          ? '<span class="badge red">Atrasada</span>'
          : dl !== null && dl <= 14
            ? '<span class="badge amber">Reta final</span>'
            : '<span class="badge">Em andamento</span>';
      return `
        <div class="card hoverable">
          <div class="flex-between" style="margin-bottom:10px">
            <b style="font-size:15px">${esc(m.nome)}</b>
            ${status}
          </div>
          <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
            <span class="badge gray">${esc(m.categoria)}</span>
            <span class="badge ${m.prioridade === 'Alta' ? 'red' : m.prioridade === 'Média' ? 'amber' : 'gray'}">${esc(m.prioridade)}</span>
            ${dl !== null ? `<span class="badge gray">${dl >= 0 ? dl + ' dias restantes' : Math.abs(dl) + ' dias de atraso'}</span>` : ''}
          </div>
          <div class="flex-between" style="margin-bottom:6px">
            <span class="muted small">${FF.money(m.atual)} de ${FF.money(m.objetivo)}</span>
            <b style="font-size:13px">${FF.pct(p)}</b>
          </div>
          <div class="progress ${completa ? 'green' : p < 35 ? 'amber' : ''}"><span style="width:${p}%"></span></div>
          <div class="flex-between mt-16">
            <button class="btn btn-ghost btn-sm" data-add="${m.id}">💰 Aportar</button>
            <div class="td-actions">
              <button class="row-btn" data-edit="${m.id}" title="Editar">✏️</button>
              <button class="row-btn del" data-del="${m.id}" title="Excluir">🗑️</button>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(b.dataset.edit));
    grid.querySelectorAll('[data-del]').forEach(b => b.onclick = () =>
      FF.confirmDialog('Excluir esta meta?', () => {
        FF.state.metas = FF.state.metas.filter(m => m.id !== b.dataset.del);
        FF.save(); FF.toast('Meta excluída', '', '🗑️'); render();
      }));
    grid.querySelectorAll('[data-add]').forEach(b => b.onclick = () => aporte(b.dataset.add));
  }

  function aporte(id) {
    const m = FF.state.metas.find(x => x.id === id);
    FF.modal({
      title: `Aportar em "${esc(m.nome)}"`,
      body: `<div class="field"><label>Valor do aporte (R$)</label>
        <input type="number" id="mAporte" min="0" step="0.01" placeholder="0,00" autofocus></div>
        <p class="muted small mt-8">Faltam ${FF.money(Math.max(0, m.objetivo - m.atual))} para concluir.</p>`,
      saveLabel: 'Aportar',
      onSave: (ov) => {
        const v = parseFloat(ov.querySelector('#mAporte').value);
        if (!v || v <= 0) { FF.toast('Informe um valor válido', 'error', '⚠️'); return false; }
        const antes = m.atual >= m.objetivo;
        m.atual += v;
        FF.save();
        FF.addXP(15, 'aporte em meta');
        if (!antes && m.atual >= m.objetivo) {
          FF.toast(`Meta "${m.nome}" concluída! 🎉`, 'success', '🏁');
          FF.addXP(100, 'meta concluída');
        }
        FF.checkAchievements();
        render();
      },
    });
  }

  function openForm(id) {
    const m = id ? FF.state.metas.find(x => x.id === id) : null;
    FF.modal({
      title: m ? 'Editar meta' : 'Nova meta',
      body: `
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1"><label>Nome</label>
            <input id="fNome" value="${m ? esc(m.nome) : ''}" placeholder="Ex: MacBook, Viagem, Reserva…"></div>
          <div class="field"><label>Valor objetivo (R$)</label>
            <input type="number" id="fObj" min="0" step="0.01" value="${m ? m.objetivo : ''}"></div>
          <div class="field"><label>Valor atual (R$)</label>
            <input type="number" id="fAtual" min="0" step="0.01" value="${m ? m.atual : 0}"></div>
          <div class="field"><label>Prazo</label>
            <input type="date" id="fPrazo" value="${m ? m.prazo || '' : ''}"></div>
          <div class="field"><label>Categoria</label>
            <select id="fCat">${CATS.map(c => `<option ${m && m.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label>Prioridade</label>
            <select id="fPrio">${PRIOS.map(p => `<option ${m && m.prioridade === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        </div>`,
      onSave: (ov) => {
        const nome = ov.querySelector('#fNome').value.trim();
        const objetivo = parseFloat(ov.querySelector('#fObj').value);
        if (!nome || !objetivo || objetivo <= 0) { FF.toast('Informe nome e valor objetivo', 'error', '⚠️'); return false; }
        const data = {
          nome, objetivo,
          atual: parseFloat(ov.querySelector('#fAtual').value) || 0,
          prazo: ov.querySelector('#fPrazo').value || '',
          categoria: ov.querySelector('#fCat').value,
          prioridade: ov.querySelector('#fPrio').value,
        };
        if (m) { Object.assign(m, data); FF.toast('Meta atualizada', 'success', '✅'); }
        else { FF.state.metas.push({ id: FF.uid(), ...data }); FF.addXP(20, 'nova meta criada'); }
        FF.save(); FF.checkAchievements(); render();
      },
    });
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  render();
})();

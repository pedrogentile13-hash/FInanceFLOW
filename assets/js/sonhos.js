/* ============================================================
   FinanceFlow — Sonhos (painel visual)
   ============================================================ */

(() => {
  FF.init({
    title: 'Sonhos',
    subtitle: 'O painel visual do seu futuro',
    actions: `<button class="btn btn-primary" id="newDream">+ Novo sonho</button>`,
  });
  document.getElementById('newDream').onclick = () => openForm();

  const EMOJIS = ['✨', '🇨🇳', '💻', '🏢', '🚗', '🎮', '✈️', '🏠', '📱', '🎸', '⌚', '🏍️', '🎓', '💍', '🌎'];

  function mediaEconomiaMensal() {
    // média de saldo positivo por mês nos últimos 3 meses
    const now = new Date();
    let soma = 0, n = 0;
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const t = FF.totals(FF.txMonth(d.getFullYear(), d.getMonth()));
      if (t.in > 0 || t.out > 0) { soma += t.saldo; n++; }
    }
    return n ? soma / n : 0;
  }

  function render() {
    const sonhos = FF.state.sonhos;
    const totalValor = sonhos.reduce((s, d) => s + d.valor, 0);
    const totalAcum = sonhos.reduce((s, d) => s + Math.min(d.acumulado, d.valor), 0);
    const media = mediaEconomiaMensal();

    document.getElementById('kpis').innerHTML = `
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Sonhos cadastrados</span><span class="kpi-icon ">${FF.icon('star')}</span></div>
        <div class="kpi-value">${sonhos.length}</div>
        <div class="kpi-sub">${sonhos.filter(d => d.acumulado >= d.valor).length} realizados</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Custo total dos sonhos</span><span class="kpi-icon amber">${FF.icon('star')}</span></div>
        <div class="kpi-value">${FF.money(totalValor)}</div><div class="kpi-sub">Somatório de tudo</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Já acumulado</span><span class="kpi-icon green">${FF.icon('wallet')}</span></div>
        <div class="kpi-value">${FF.money(totalAcum)}</div>
        <div class="kpi-sub">${totalValor ? FF.pct((totalAcum / totalValor) * 100) : '0%'} realizados</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Ritmo de economia</span><span class="kpi-icon ">${FF.icon('trending-up')}</span></div>
        <div class="kpi-value">${FF.money(media)}/mês</div><div class="kpi-sub">Média dos últimos 3 meses</div></div>`;

    const grid = document.getElementById('dreamsGrid');
    if (!sonhos.length) {
      grid.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty">
        <div class="e-icon">✨</div><h4>Nenhum sonho cadastrado</h4><p>Dê forma ao que você quer conquistar.</p></div></div>`;
      return;
    }

    grid.innerHTML = sonhos.map(d => {
      const p = d.valor > 0 ? Math.min(100, (d.acumulado / d.valor) * 100) : 0;
      const falta = Math.max(0, d.valor - d.acumulado);
      const done = d.acumulado >= d.valor;
      let previsao = '—';
      if (done) previsao = 'Realizado! 🎉';
      else if (media > 0) {
        const meses = Math.ceil(falta / media);
        previsao = meses <= 1 ? '≈ 1 mês' : `≈ ${meses} meses`;
      } else previsao = 'Economize para prever';
      return `
        <div class="dream-card">
          <div class="dream-cover">${d.emoji || '✨'}</div>
          <div class="dream-body">
            <div class="flex-between">
              <b style="font-size:15px">${esc(d.nome)}</b>
              ${done ? '<span class="badge green">✔ Realizado</span>' : `<span class="badge">${FF.pct(p)}</span>`}
            </div>
            <div class="progress ${done ? 'green' : ''}"><span style="width:${p}%"></span></div>
            <div class="muted small">
              <div class="flex-between"><span>Acumulado</span><b>${FF.money(d.acumulado)}</b></div>
              <div class="flex-between"><span>Meta</span><b>${FF.money(d.valor)}</b></div>
              <div class="flex-between"><span>Falta</span><b class="${falta > 0 ? 'text-danger' : 'text-success'}">${FF.money(falta)}</b></div>
              <div class="flex-between"><span>Previsão</span><b>${previsao}</b></div>
            </div>
            <div class="flex-between" style="margin-top:auto">
              <button class="btn btn-ghost btn-sm" data-add="${d.id}">Guardar</button>
              <div class="td-actions">
                <button class="row-btn" data-edit="${d.id}">${FF.icon('pencil', 14)}</button>
                <button class="row-btn del" data-del="${d.id}">${FF.icon('trash', 14)}</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(b.dataset.edit));
    grid.querySelectorAll('[data-del]').forEach(b => b.onclick = () =>
      FF.confirmDialog('Excluir este sonho?', () => {
        FF.state.sonhos = FF.state.sonhos.filter(d => d.id !== b.dataset.del);
        FF.save(); FF.toast('Sonho excluído', '', '🗑️'); render();
      }));
    grid.querySelectorAll('[data-add]').forEach(b => b.onclick = () => aporte(b.dataset.add));
  }

  function aporte(id) {
    const d = FF.state.sonhos.find(x => x.id === id);
    FF.modal({
      title: `Guardar para "${esc(d.nome)}" ${d.emoji}`,
      body: `<div class="field"><label>Valor (R$)</label>
        <input type="number" id="dAporte" min="0" step="0.01" placeholder="0,00"></div>`,
      saveLabel: 'Guardar',
      onSave: (ov) => {
        const v = parseFloat(ov.querySelector('#dAporte').value);
        if (!v || v <= 0) { FF.toast('Informe um valor válido', 'error', '⚠️'); return false; }
        const antes = d.acumulado >= d.valor;
        d.acumulado += v;
        FF.save();
        FF.addXP(15, 'guardou para um sonho');
        if (!antes && d.acumulado >= d.valor) {
          FF.toast(`Sonho "${d.nome}" realizado! 🎉`, 'success', '🌟');
          FF.addXP(150, 'sonho realizado');
        }
        FF.checkAchievements();
        render();
      },
    });
  }

  function openForm(id) {
    const d = id ? FF.state.sonhos.find(x => x.id === id) : null;
    FF.modal({
      title: d ? 'Editar sonho' : 'Novo sonho',
      body: `
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1"><label>Nome</label>
            <input id="dNome" value="${d ? esc(d.nome) : ''}" placeholder="Ex: Viagem, carro, setup…"></div>
          <div class="field"><label>Ícone</label>
            <select id="dEmoji">${EMOJIS.map(e => `<option ${d && d.emoji === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
          <div class="field"><label>Valor necessário (R$)</label>
            <input type="number" id="dValor" min="0" step="0.01" value="${d ? d.valor : ''}"></div>
          <div class="field"><label>Já acumulado (R$)</label>
            <input type="number" id="dAcum" min="0" step="0.01" value="${d ? d.acumulado : 0}"></div>
        </div>`,
      onSave: (ov) => {
        const nome = ov.querySelector('#dNome').value.trim();
        const valor = parseFloat(ov.querySelector('#dValor').value);
        if (!nome || !valor || valor <= 0) { FF.toast('Informe nome e valor', 'error', '⚠️'); return false; }
        const data = {
          nome, valor,
          emoji: ov.querySelector('#dEmoji').value,
          acumulado: parseFloat(ov.querySelector('#dAcum').value) || 0,
        };
        if (d) { Object.assign(d, data); FF.toast('Sonho atualizado', 'success', '✅'); }
        else { FF.state.sonhos.push({ id: FF.uid(), ...data }); FF.addXP(20, 'novo sonho cadastrado'); }
        FF.save(); FF.checkAchievements(); render();
      },
    });
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  render();
})();

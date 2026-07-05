/* ============================================================
   FinanceFlow — Projetos (mini sistemas de negócio)
   Inclui Dashboard Startup: MRR, ARR, runway, crescimento
   ============================================================ */

(() => {
  FF.init({
    title: 'Projetos',
    subtitle: 'Cada projeto é um negócio — trate como um',
    actions: `<button class="btn btn-primary" id="newProj">+ Novo projeto</button>`,
  });
  document.getElementById('newProj').onclick = () => openForm();

  const STATUS = ['Ativo', 'Planejamento', 'Pausado', 'Concluído'];
  let revChart = null;

  function allLanc() {
    return FF.state.projetos.flatMap(p => (p.lancamentos || []).map(l => ({ ...l, proj: p.nome })));
  }

  function mrr() {
    // receita média mensal dos últimos 3 meses
    const now = new Date();
    let soma = 0;
    for (let i = 0; i < 3; i++) {
      const k = `${new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth() + 1).padStart(2, '0')}`;
      soma += allLanc().filter(l => l.tipo === 'receita' && l.data.slice(0, 7) === k).reduce((s, l) => s + l.valor, 0);
    }
    return soma / 3;
  }

  function render() {
    const projs = FF.state.projetos;
    const tot = projs.reduce((acc, p) => {
      const t = FF.projTotals(p);
      acc.rec += t.receita; acc.cus += t.custos; acc.lucro += t.lucro; acc.cli += p.clientes || 0;
      return acc;
    }, { rec: 0, cus: 0, lucro: 0, cli: 0 });

    const _mrr = mrr();
    const burn = (() => {
      const now = new Date();
      let soma = 0;
      for (let i = 0; i < 3; i++) {
        const k = `${new Date(now.getFullYear(), now.getMonth() - i, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth() - i, 1).getMonth() + 1).padStart(2, '0')}`;
        soma += allLanc().filter(l => l.tipo === 'custo' && l.data.slice(0, 7) === k).reduce((s, l) => s + l.valor, 0);
      }
      return soma / 3;
    })();
    const runway = burn > 0 ? (FF.patrimonio() / burn) : Infinity;
    const ticket = tot.cli > 0 ? tot.rec / tot.cli : 0;

    document.getElementById('kpis').innerHTML = `
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Receita Total</span><span class="kpi-icon green">${FF.icon('trending-up')}</span></div>
        <div class="kpi-value text-success">${FF.money(tot.rec)}</div><div class="kpi-sub">Todos os projetos</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Lucro Líquido</span><span class="kpi-icon ${tot.lucro >= 0 ? 'green' : 'red'}">${FF.icon('wallet')}</span></div>
        <div class="kpi-value ${tot.lucro >= 0 ? 'text-success' : 'text-danger'}">${FF.money(tot.lucro)}</div>
        <div class="kpi-sub">Custos: ${FF.money(tot.cus)}</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">MRR</span><span class="kpi-icon ">${FF.icon('trending-up')}</span></div>
        <div class="kpi-value">${FF.money(_mrr)}</div><div class="kpi-sub">ARR: ${FF.money(_mrr * 12)}</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Runway</span><span class="kpi-icon amber">${FF.icon('clock')}</span></div>
        <div class="kpi-value">${runway === Infinity ? '∞' : runway.toFixed(1) + ' meses'}</div>
        <div class="kpi-sub">Patrimônio ÷ burn mensal</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Clientes</span><span class="kpi-icon ">${FF.icon('users')}</span></div>
        <div class="kpi-value">${tot.cli}</div><div class="kpi-sub">Ticket médio: ${FF.money(ticket)}</div></div>`;

    // cards de projetos
    const grid = document.getElementById('projGrid');
    if (!projs.length) {
      grid.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty">
        <div class="e-icon">🏗️</div><h4>Nenhum projeto</h4><p>Transforme suas ideias em negócios mensuráveis.</p></div></div>`;
    } else {
      grid.innerHTML = projs.map(p => {
        const t = FF.projTotals(p);
        const margem = t.receita > 0 ? (t.lucro / t.receita) * 100 : 0;
        const badge = { Ativo: 'green', Planejamento: 'amber', Pausado: 'gray', 'Concluído': '' }[p.status] ?? 'gray';
        return `
          <div class="card hoverable">
            <div class="flex-between" style="margin-bottom:12px">
              <b style="font-size:15.5px">${esc(p.nome)}</b>
              <span class="badge ${badge}">${esc(p.status)}</span>
            </div>
            <p class="muted small" style="margin-bottom:14px">${esc(p.obs || 'Sem descrição')}</p>
            <div class="grid" style="grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
              <div><div class="muted small">Receita</div><b class="text-success" style="font-size:14px">${FF.money(t.receita)}</b></div>
              <div><div class="muted small">Custos</div><b class="text-danger" style="font-size:14px">${FF.money(t.custos)}</b></div>
              <div><div class="muted small">Lucro</div><b style="font-size:14px">${FF.money(t.lucro)}</b></div>
            </div>
            <div class="flex-between muted small" style="margin-bottom:14px">
              <span>👥 ${p.clientes || 0} clientes</span>
              <span>Margem: <b>${FF.pct(margem)}</b></span>
            </div>
            <div class="flex-between">
              <button class="btn btn-ghost btn-sm" data-lanc="${p.id}">+ Lançamento</button>
              <div class="td-actions">
                <button class="row-btn" data-view="${p.id}" title="Ver lançamentos">${FF.icon('layers', 14)}</button>
                <button class="row-btn" data-edit="${p.id}" title="Editar">${FF.icon('pencil', 14)}</button>
                <button class="row-btn del" data-del="${p.id}" title="Excluir">${FF.icon('trash', 14)}</button>
              </div>
            </div>
          </div>`;
      }).join('');
      grid.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(b.dataset.edit));
      grid.querySelectorAll('[data-lanc]').forEach(b => b.onclick = () => openLanc(b.dataset.lanc));
      grid.querySelectorAll('[data-view]').forEach(b => b.onclick = () => viewLanc(b.dataset.view));
      grid.querySelectorAll('[data-del]').forEach(b => b.onclick = () =>
        FF.confirmDialog('Excluir este projeto e todos os lançamentos dele?', () => {
          FF.state.projetos = FF.state.projetos.filter(p => p.id !== b.dataset.del);
          FF.save(); FF.toast('Projeto excluído', '', '🗑️'); render();
        }));
    }

    // gráfico receita x custo por projeto
    if (revChart) revChart.destroy();
    revChart = new Chart(document.getElementById('projChart'), {
      type: 'bar',
      data: {
        labels: projs.map(p => p.nome),
        datasets: [
          { label: 'Receita', data: projs.map(p => FF.projTotals(p).receita), backgroundColor: '#22C55E', borderRadius: 6, maxBarThickness: 30 },
          { label: 'Custos', data: projs.map(p => FF.projTotals(p).custos), backgroundColor: '#EF4444', borderRadius: 6, maxBarThickness: 30 },
        ],
      },
      options: { maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$' + v } }, x: { grid: { display: false } } },
        plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${FF.money(c.parsed.y)}` } } } },
    });
  }

  function openLanc(pid) {
    const p = FF.state.projetos.find(x => x.id === pid);
    FF.modal({
      title: `Lançamento em ${esc(p.nome)}`,
      body: `
        <div class="form-grid">
          <div class="field"><label>Tipo</label>
            <select id="lTipo"><option value="receita">💵 Receita</option><option value="custo">💸 Custo</option></select></div>
          <div class="field"><label>Valor (R$)</label>
            <input type="number" id="lValor" min="0" step="0.01" placeholder="0,00"></div>
          <div class="field"><label>Data</label><input type="date" id="lData" value="${FF.todayISO()}"></div>
          <div class="field" style="grid-column:1/-1"><label>Descrição</label>
            <input id="lDesc" placeholder="Ex: Venda de site, assinatura de ferramenta…"></div>
        </div>`,
      onSave: (ov) => {
        const valor = parseFloat(ov.querySelector('#lValor').value);
        const desc = ov.querySelector('#lDesc').value.trim();
        if (!valor || valor <= 0 || !desc) { FF.toast('Informe valor e descrição', 'error', '⚠️'); return false; }
        p.lancamentos = p.lancamentos || [];
        p.lancamentos.push({
          id: FF.uid(),
          tipo: ov.querySelector('#lTipo').value,
          valor, desc,
          data: ov.querySelector('#lData').value || FF.todayISO(),
        });
        FF.save();
        FF.addXP(15, 'lançamento em projeto');
        FF.checkAchievements();
        render();
      },
    });
  }

  function viewLanc(pid) {
    const p = FF.state.projetos.find(x => x.id === pid);
    const ls = [...(p.lancamentos || [])].sort((a, b) => b.data.localeCompare(a.data));
    FF.modal({
      title: `Lançamentos — ${esc(p.nome)}`,
      saveLabel: 'Fechar',
      body: ls.length ? `
        <div class="table-wrap"><table class="ff-table">
          <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th></th></tr></thead>
          <tbody>${ls.map(l => `
            <tr>
              <td>${FF.dateBR(l.data)}</td>
              <td>${esc(l.desc)}</td>
              <td class="${l.tipo === 'receita' ? 'td-value-in' : 'td-value-out'}">${l.tipo === 'receita' ? '+' : '−'} ${FF.money(l.valor)}</td>
              <td><button class="row-btn del" data-ldel="${l.id}">${FF.icon('trash', 14)}</button></td>
            </tr>`).join('')}</tbody>
        </table></div>`
        : `<div class="empty"><div class="e-icon">📋</div><h4>Sem lançamentos</h4></div>`,
      onSave: () => {},
    }).querySelectorAll('[data-ldel]').forEach(b => b.onclick = () => {
      p.lancamentos = p.lancamentos.filter(l => l.id !== b.dataset.ldel);
      FF.save(); FF.closeModal(); render(); FF.toast('Lançamento removido', '', '🗑️');
    });
  }

  function openForm(id) {
    const p = id ? FF.state.projetos.find(x => x.id === id) : null;
    FF.modal({
      title: p ? 'Editar projeto' : 'Novo projeto',
      body: `
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1"><label>Nome</label>
            <input id="pNome" value="${p ? esc(p.nome) : ''}" placeholder="Ex: TCCFlow"></div>
          <div class="field"><label>Status</label>
            <select id="pStatus">${STATUS.map(s => `<option ${p && p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
          <div class="field"><label>Clientes</label>
            <input type="number" id="pCli" min="0" step="1" value="${p ? p.clientes || 0 : 0}"></div>
          <div class="field" style="grid-column:1/-1"><label>Descrição</label>
            <textarea id="pObs" placeholder="O que é este projeto?">${p ? esc(p.obs || '') : ''}</textarea></div>
        </div>`,
      onSave: (ov) => {
        const nome = ov.querySelector('#pNome').value.trim();
        if (!nome) { FF.toast('Informe o nome do projeto', 'error', '⚠️'); return false; }
        const data = {
          nome,
          status: ov.querySelector('#pStatus').value,
          clientes: parseInt(ov.querySelector('#pCli').value) || 0,
          obs: ov.querySelector('#pObs').value.trim(),
        };
        if (p) { Object.assign(p, data); FF.toast('Projeto atualizado', 'success', '✅'); }
        else { FF.state.projetos.push({ id: FF.uid(), lancamentos: [], ...data }); FF.addXP(30, 'novo projeto criado'); }
        FF.save(); FF.checkAchievements(); render();
      },
    });
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  render();
})();

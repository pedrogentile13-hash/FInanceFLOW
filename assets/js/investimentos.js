/* ============================================================
   FinanceFlow — Investimentos
   ============================================================ */

(() => {
  FF.init({
    title: 'Investimentos',
    subtitle: 'Sua carteira trabalhando por você',
    actions: `<button class="btn btn-primary" id="newInv">＋ Novo investimento</button>`,
  });
  document.getElementById('newInv').onclick = () => openForm();

  const TIPOS = ['Caixa', 'Nubank', 'CDB', 'Tesouro Direto', 'Outros'];
  let pieChart = null, growthChart = null;

  function mesesDesde(iso) {
    if (!iso) return 0;
    const d = new Date(iso + 'T00:00');
    return Math.max(0, (Date.now() - d.getTime()) / (30.44 * 86400000));
  }

  // rendimento anual (%) → valor atual simulado com juros compostos mensais
  function valorAtual(inv) {
    const taxaMensal = Math.pow(1 + (inv.rendimento || 0) / 100, 1 / 12) - 1;
    return inv.value * Math.pow(1 + taxaMensal, mesesDesde(inv.data));
  }

  function render() {
    const invs = FF.state.investimentos;
    const investido = invs.reduce((s, i) => s + i.value, 0);
    const atual = invs.reduce((s, i) => s + valorAtual(i), 0);
    const rendimento = atual - investido;
    const rentab = investido > 0 ? (rendimento / investido) * 100 : 0;

    document.getElementById('kpis').innerHTML = `
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Total investido</span><span class="kpi-icon">💼</span></div>
        <div class="kpi-value">${FF.money(investido)}</div><div class="kpi-sub">${invs.length} aplicações</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Valor atual (simulado)</span><span class="kpi-icon green">📈</span></div>
        <div class="kpi-value">${FF.money(atual)}</div><div class="kpi-sub">Com juros compostos</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Rendimento acumulado</span><span class="kpi-icon ${rendimento >= 0 ? 'green' : 'red'}">💹</span></div>
        <div class="kpi-value ${rendimento >= 0 ? 'text-success' : 'text-danger'}">${FF.money(rendimento)}</div>
        <div class="kpi-sub">Simulação pela taxa informada</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Rentabilidade</span><span class="kpi-icon amber">🎚️</span></div>
        <div class="kpi-value">${FF.pct(rentab)}</div><div class="kpi-sub">Sobre o capital investido</div></div>`;

    // tabela
    const tbody = document.getElementById('invBody');
    if (!invs.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty">
        <div class="e-icon">📈</div><h4>Nenhum investimento</h4><p>Comece a fazer seu dinheiro render.</p></div></td></tr>`;
    } else {
      tbody.innerHTML = invs.map(i => {
        const va = valorAtual(i);
        return `
        <tr>
          <td><span class="badge">${esc(i.tipo)}</span></td>
          <td>${FF.dateBR(i.data)}</td>
          <td><b>${FF.money(i.value)}</b></td>
          <td>${FF.pct(i.rendimento || 0)} a.a.</td>
          <td class="td-value-in">${FF.money(va)}</td>
          <td class="muted">${esc(i.obs || '—')}</td>
          <td class="td-actions">
            <button class="row-btn" data-edit="${i.id}">✏️</button>
            <button class="row-btn del" data-del="${i.id}">🗑️</button>
          </td>
        </tr>`;
      }).join('');
      tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(b.dataset.edit));
      tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () =>
        FF.confirmDialog('Excluir este investimento?', () => {
          FF.state.investimentos = FF.state.investimentos.filter(i => i.id !== b.dataset.del);
          FF.save(); FF.toast('Investimento excluído', '', '🗑️'); render();
        }));
    }

    // pizza por tipo
    const map = {};
    for (const i of invs) map[i.tipo] = (map[i.tipo] || 0) + i.value;
    const entries = Object.entries(map);
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(document.getElementById('invPie'), {
      type: 'doughnut',
      data: { labels: entries.map(e => e[0]), datasets: [{ data: entries.map(e => e[1]), backgroundColor: FF.PALETTE, borderWidth: 0, hoverOffset: 8 }] },
      options: { maintainAspectRatio: false, cutout: '66%', plugins: { legend: { position: 'bottom' },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${FF.money(c.parsed)}` } } } },
    });

    // projeção de crescimento 24 meses
    const labels = [], data = [];
    for (let m = 0; m <= 24; m += 2) {
      labels.push(m === 0 ? 'Hoje' : `${m}m`);
      let v = 0;
      for (const i of invs) {
        const taxa = Math.pow(1 + (i.rendimento || 0) / 100, 1 / 12) - 1;
        v += valorAtual(i) * Math.pow(1 + taxa, m);
      }
      data.push(v);
    }
    if (growthChart) growthChart.destroy();
    growthChart = new Chart(document.getElementById('invGrowth'), {
      type: 'line',
      data: { labels, datasets: [{ label: 'Carteira projetada', data, borderColor: '#22C55E', borderWidth: 2.5, tension: .4,
        pointRadius: 2, fill: true,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
          g.addColorStop(0, 'rgba(34,197,94,.22)'); g.addColorStop(1, 'rgba(34,197,94,0)');
          return g;
        } }] },
      options: { maintainAspectRatio: false,
        scales: { y: { ticks: { callback: v => 'R$' + Math.round(v) } }, x: { grid: { display: false } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${FF.money(c.parsed.y)}` } } } },
    });
  }

  function openForm(id) {
    const i = id ? FF.state.investimentos.find(x => x.id === id) : null;
    FF.modal({
      title: i ? 'Editar investimento' : 'Novo investimento',
      body: `
        <div class="form-grid">
          <div class="field"><label>Tipo</label>
            <select id="iTipo">${TIPOS.map(t => `<option ${i && i.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div class="field"><label>Valor aplicado (R$)</label>
            <input type="number" id="iValor" min="0" step="0.01" value="${i ? i.value : ''}"></div>
          <div class="field"><label>Data da aplicação</label>
            <input type="date" id="iData" value="${i ? i.data : FF.todayISO()}"></div>
          <div class="field"><label>Rendimento esperado (% a.a.)</label>
            <input type="number" id="iRend" min="0" step="0.1" value="${i ? i.rendimento : 10}"></div>
          <div class="field" style="grid-column:1/-1"><label>Observação</label>
            <input id="iObs" value="${i ? esc(i.obs || '') : ''}" placeholder="Ex: CDB 110% CDI"></div>
        </div>`,
      onSave: (ov) => {
        const valor = parseFloat(ov.querySelector('#iValor').value);
        const data = ov.querySelector('#iData').value;
        if (!valor || valor <= 0 || !data) { FF.toast('Informe valor e data', 'error', '⚠️'); return false; }
        const payload = {
          tipo: ov.querySelector('#iTipo').value,
          value: valor, data,
          rendimento: parseFloat(ov.querySelector('#iRend').value) || 0,
          obs: ov.querySelector('#iObs').value.trim(),
        };
        if (i) { Object.assign(i, payload); FF.toast('Investimento atualizado', 'success', '✅'); }
        else { FF.state.investimentos.push({ id: FF.uid(), ...payload }); FF.addXP(25, 'novo investimento'); }
        FF.save(); FF.checkAchievements(); render();
      },
    });
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  render();
})();

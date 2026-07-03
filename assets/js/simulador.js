/* ============================================================
   FinanceFlow — Simulador financeiro
   Guardar dinheiro · Calculadora de compra · Calculadoras PRO
   ============================================================ */

(() => {
  FF.init({
    title: 'Simulador',
    subtitle: 'Veja o futuro antes de decidir',
  });

  let simChart = null;

  /* ================= 1. Simulador de guardar dinheiro ================= */
  function runSaveSim() {
    const valor = parseFloat(document.getElementById('sValor').value) || 0;
    const freq = document.getElementById('sFreq').value; // semana | mes
    const juros = parseFloat(document.getElementById('sJuros').value) || 0; // % a.a.
    if (valor <= 0) { FF.toast('Informe um valor para simular', 'error', '⚠️'); return; }

    const porMes = freq === 'semana' ? valor * 4.345 : valor;
    const taxaMensal = Math.pow(1 + juros / 100, 1 / 12) - 1;

    const marcos = [1, 3, 6, 12, 36, 60];
    const nomes = ['1 mês', '3 meses', '6 meses', '1 ano', '3 anos', '5 anos'];

    const calc = (meses) => {
      let total = 0;
      for (let m = 0; m < meses; m++) total = (total + porMes) * (1 + taxaMensal);
      return total;
    };

    document.getElementById('saveResults').innerHTML = marcos.map((m, i) => {
      const v = calc(m);
      const aportado = porMes * m;
      return `
        <div class="kpi">
          <div class="kpi-head"><span class="kpi-label">${nomes[i]}</span><span class="kpi-icon green">💰</span></div>
          <div class="kpi-value" style="font-size:19px">${FF.money(v)}</div>
          <div class="kpi-sub">${juros > 0 ? `+${FF.money(v - aportado)} em juros` : `${FF.money(aportado)} aportados`}</div>
        </div>`;
    }).join('');

    // gráfico mês a mês até 60 meses
    const labels = [], data = [], aporte = [];
    let total = 0;
    for (let m = 1; m <= 60; m++) {
      total = (total + porMes) * (1 + taxaMensal);
      if (m % 3 === 0 || m === 1) { labels.push(m + 'm'); data.push(total); aporte.push(porMes * m); }
    }
    if (simChart) simChart.destroy();
    simChart = new Chart(document.getElementById('simChart'), {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Com juros', data, borderColor: '#22C55E', borderWidth: 2.5, tension: .4, pointRadius: 0, fill: true,
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
            g.addColorStop(0, 'rgba(34,197,94,.2)'); g.addColorStop(1, 'rgba(34,197,94,0)');
            return g;
          } },
        { label: 'Somente aportes', data: aporte, borderColor: '#94A3B8', borderDash: [6, 4], borderWidth: 2, tension: .4, pointRadius: 0 },
      ] },
      options: { maintainAspectRatio: false,
        scales: { y: { ticks: { callback: v => 'R$' + Math.round(v) } }, x: { grid: { display: false } } },
        plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${FF.money(c.parsed.y)}` } } } },
    });

    document.getElementById('simChartCard').style.display = '';
  }
  document.getElementById('runSave').onclick = runSaveSim;

  /* ================= 2. Calculadora de compra ================= */
  function runBuy() {
    const nome = document.getElementById('bNome').value.trim() || 'Produto';
    const valor = parseFloat(document.getElementById('bValor').value) || 0;
    if (valor <= 0) { FF.toast('Informe o valor do produto', 'error', '⚠️'); return; }

    const patr = FF.patrimonio();
    const pctPatr = patr > 0 ? (valor / patr) * 100 : 0;
    const sobra = patr - valor;

    // média de economia diária (saldo médio diário dos últimos 90 dias)
    const cut = new Date(); cut.setDate(cut.getDate() - 90);
    const cutISO = cut.toISOString().slice(0, 10);
    const recent = FF.state.transactions.filter(t => t.date >= cutISO);
    const saldo90 = recent.reduce((s, t) => s + (t.type === 'in' ? t.value : -t.value), 0);
    const ecoDia = saldo90 / 90;
    const diasEco = ecoDia > 0 ? Math.ceil(valor / ecoDia) : null;

    const meta = [...FF.state.metas].filter(m => m.atual < m.objetivo)
      .sort((a, b) => ({ Alta: 0, 'Média': 1, Baixa: 2 }[a.prioridade] ?? 3) - ({ Alta: 0, 'Média': 1, Baixa: 2 }[b.prioridade] ?? 3))[0];
    const atrasoMeta = meta && ecoDia > 0 ? Math.ceil(valor / ecoDia) : null;

    const nivel = pctPatr > 50 ? ['red', '🚨', 'Compra de alto impacto — mais da metade do seu patrimônio.']
      : pctPatr > 25 ? ['amber', '⚠️', 'Compra significativa. Vale dormir uma noite antes de decidir.']
      : ['green', '✅', 'Compra confortável para o seu patrimônio atual.'];

    document.getElementById('buyResults').innerHTML = `
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">% do patrimônio</span><span class="kpi-icon ${nivel[0]}">${nivel[1]}</span></div>
        <div class="kpi-value">${FF.pct(pctPatr)}</div><div class="kpi-sub">${nome}: ${FF.money(valor)}</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Quanto sobra</span><span class="kpi-icon ${sobra >= 0 ? '' : 'red'}">💳</span></div>
        <div class="kpi-value ${sobra >= 0 ? '' : 'text-danger'}">${FF.money(sobra)}</div><div class="kpi-sub">Patrimônio: ${FF.money(patr)}</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Dias de economia</span><span class="kpi-icon amber">📅</span></div>
        <div class="kpi-value">${diasEco !== null ? diasEco + ' dias' : '—'}</div>
        <div class="kpi-sub">${diasEco !== null ? 'No seu ritmo médio atual' : 'Sem ritmo de economia detectado'}</div></div>
      <div class="kpi"><div class="kpi-head"><span class="kpi-label">Impacto na meta</span><span class="kpi-icon">🎯</span></div>
        <div class="kpi-value" style="font-size:19px">${meta ? (atrasoMeta !== null ? `+${atrasoMeta} dias` : '—') : '—'}</div>
        <div class="kpi-sub">${meta ? `Atraso estimado em "${meta.nome}"` : 'Nenhuma meta ativa'}</div></div>`;

    document.getElementById('buyVerdict').innerHTML = `
      <div class="insight ${nivel[0] === 'green' ? 'good' : nivel[0] === 'red' ? 'bad' : 'warn'}">
        <span class="i-icon">${nivel[1]}</span>
        <div><small>Veredito da IA</small><p>${nivel[2]}</p></div>
      </div>`;
  }
  document.getElementById('runBuy').onclick = runBuy;

  /* ================= 3. Calculadoras PRO ================= */
  const CALCS = {
    roi: {
      nome: 'ROI', desc: 'Retorno sobre investimento',
      campos: [['Investimento (R$)', 'inv'], ['Retorno obtido (R$)', 'ret']],
      calc: v => {
        const roi = v.inv > 0 ? ((v.ret - v.inv) / v.inv) * 100 : 0;
        return [`ROI: <b>${FF.pct(roi)}</b>`, `Lucro: <b>${FF.money(v.ret - v.inv)}</b>`];
      },
    },
    lucro: {
      nome: 'Lucro', desc: 'Receita − custos',
      campos: [['Receita (R$)', 'rec'], ['Custos (R$)', 'cus']],
      calc: v => {
        const l = v.rec - v.cus;
        const m = v.rec > 0 ? (l / v.rec) * 100 : 0;
        return [`Lucro: <b>${FF.money(l)}</b>`, `Margem líquida: <b>${FF.pct(m)}</b>`];
      },
    },
    markup: {
      nome: 'Markup', desc: 'Multiplicador sobre o custo',
      campos: [['Custo (R$)', 'custo'], ['Preço de venda (R$)', 'preco']],
      calc: v => {
        const mk = v.custo > 0 ? ((v.preco - v.custo) / v.custo) * 100 : 0;
        return [`Markup: <b>${FF.pct(mk)}</b>`, `Ganho por unidade: <b>${FF.money(v.preco - v.custo)}</b>`];
      },
    },
    margem: {
      nome: 'Margem', desc: 'Percentual do preço que é lucro',
      campos: [['Preço de venda (R$)', 'preco'], ['Custo (R$)', 'custo']],
      calc: v => {
        const m = v.preco > 0 ? ((v.preco - v.custo) / v.preco) * 100 : 0;
        return [`Margem: <b>${FF.pct(m)}</b>`, `Lucro por venda: <b>${FF.money(v.preco - v.custo)}</b>`];
      },
    },
    cac: {
      nome: 'CAC', desc: 'Custo de aquisição de cliente',
      campos: [['Gasto em marketing/vendas (R$)', 'gasto'], ['Clientes conquistados', 'cli']],
      calc: v => [`CAC: <b>${FF.money(v.cli > 0 ? v.gasto / v.cli : 0)}</b>`, `${v.cli} cliente(s) adquiridos`],
    },
    ltv: {
      nome: 'LTV', desc: 'Valor do cliente no tempo',
      campos: [['Ticket médio (R$)', 'ticket'], ['Compras por ano', 'freq'], ['Anos de relacionamento', 'anos']],
      calc: v => {
        const ltv = v.ticket * v.freq * v.anos;
        return [`LTV: <b>${FF.money(ltv)}</b>`, `${v.freq}x por ano durante ${v.anos} ano(s)`];
      },
    },
    breakeven: {
      nome: 'Break Even', desc: 'Ponto de equilíbrio',
      campos: [['Custos fixos mensais (R$)', 'fixo'], ['Preço por unidade (R$)', 'preco'], ['Custo variável por unidade (R$)', 'cvar']],
      calc: v => {
        const mc = v.preco - v.cvar;
        const un = mc > 0 ? Math.ceil(v.fixo / mc) : 0;
        return [`Ponto de equilíbrio: <b>${un} vendas/mês</b>`, `Margem de contribuição: <b>${FF.money(mc)}</b> por unidade`];
      },
    },
    fluxo: {
      nome: 'Fluxo de Caixa', desc: 'Projeção simples mensal',
      campos: [['Saldo inicial (R$)', 'ini'], ['Entradas mensais (R$)', 'ent'], ['Saídas mensais (R$)', 'sai'], ['Meses', 'meses']],
      calc: v => {
        const fim = v.ini + (v.ent - v.sai) * v.meses;
        return [`Saldo em ${v.meses} meses: <b class="${fim >= 0 ? 'text-success' : 'text-danger'}">${FF.money(fim)}</b>`,
          `Resultado mensal: <b>${FF.money(v.ent - v.sai)}</b>`];
      },
    },
    preco: {
      nome: 'Preço Ideal', desc: 'A partir do custo e margem desejada',
      campos: [['Custo do produto (R$)', 'custo'], ['Margem desejada (%)', 'margem']],
      calc: v => {
        const p = v.margem < 100 ? v.custo / (1 - v.margem / 100) : 0;
        return [`Preço ideal: <b>${FF.money(p)}</b>`, `Lucro por venda: <b>${FF.money(p - v.custo)}</b>`];
      },
    },
  };

  const tabsEl = document.getElementById('calcTabs');
  tabsEl.innerHTML = Object.entries(CALCS).map(([k, c], i) =>
    `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-ghost'} btn-sm" data-calc="${k}">${c.nome}</button>`).join('');

  function renderCalc(key) {
    const c = CALCS[key];
    tabsEl.querySelectorAll('button').forEach(b => {
      b.className = `btn ${b.dataset.calc === key ? 'btn-primary' : 'btn-ghost'} btn-sm`;
    });
    document.getElementById('calcBody').innerHTML = `
      <p class="muted" style="margin-bottom:14px">${c.desc}</p>
      <div class="form-grid">
        ${c.campos.map(([label, id]) => `
          <div class="field"><label>${label}</label>
            <input type="number" step="0.01" min="0" id="calc_${id}" placeholder="0"></div>`).join('')}
      </div>
      <button class="btn btn-primary mt-16" id="runCalc">Calcular ${c.nome}</button>
      <div id="calcResult" class="mt-16"></div>`;
    document.getElementById('runCalc').onclick = () => {
      const vals = {};
      for (const [, id] of c.campos) vals[id] = parseFloat(document.getElementById('calc_' + id).value) || 0;
      const res = c.calc(vals);
      document.getElementById('calcResult').innerHTML = res.map(r =>
        `<div class="insight good"><span class="i-icon">🧮</span><div><small>${c.nome}</small><p>${r}</p></div></div>`).join('');
    };
  }

  tabsEl.querySelectorAll('button').forEach(b => b.onclick = () => renderCalc(b.dataset.calc));
  renderCalc('roi');
})();

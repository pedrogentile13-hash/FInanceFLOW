/* ============================================================
   FinanceFlow — Estatísticas avançadas + Heatmap financeiro
   ============================================================ */

(() => {
  FF.init({
    title: 'Estatísticas',
    subtitle: 'O raio-x completo da sua vida financeira',
    actions: FF.periodSelectorHTML(),
  });
  FF.bindPeriodSelector();

  const S = FF.state;
  const txs = FF.periodTx(); // respeita o período escolhido (mês / 3 meses / ano / tudo)
  const ins = txs.filter(t => t.type === 'in');
  const outs = txs.filter(t => t.type === 'out');

  /* ---------- Recordes e médias ---------- */
  const maiorIn = ins.reduce((m, t) => t.value > (m?.value ?? 0) ? t : m, null);
  const maiorOut = outs.reduce((m, t) => t.value > (m?.value ?? 0) ? t : m, null);

  const byMonth = {};
  for (const t of txs) {
    const k = t.date.slice(0, 7);
    byMonth[k] = byMonth[k] || { in: 0, out: 0 };
    byMonth[k][t.type === 'in' ? 'in' : 'out'] += t.value;
  }
  const monthKeys = Object.keys(byMonth).sort();
  const nMonths = Math.max(1, monthKeys.length);

  const totalIn = ins.reduce((s, t) => s + t.value, 0);
  const totalOut = outs.reduce((s, t) => s + t.value, 0);

  // dias com atividade
  const firstDate = txs.length ? txs.map(t => t.date).sort()[0] : FF.todayISO();
  const nDays = Math.max(1, Math.ceil((Date.now() - new Date(firstDate + 'T00:00')) / 86400000));

  const catOf = (type) => {
    const map = {};
    for (const t of txs) if (t.type === type) map[t.category] = (map[t.category] || 0) + t.value;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };
  const catIn = catOf('in');
  const catOut = catOf('out');

  let melhorMes = null, piorMes = null;
  for (const k of monthKeys) {
    const saldo = byMonth[k].in - byMonth[k].out;
    if (!melhorMes || saldo > melhorMes.saldo) melhorMes = { k, saldo };
    if (!piorMes || byMonth[k].out > piorMes.out) piorMes = { k, out: byMonth[k].out };
  }
  const fmtMonth = (k) => k ? `${FF.monthName(+k.split('-')[1] - 1)}/${k.split('-')[0]}` : '—';

  const diasComGasto = new Set(outs.map(t => t.date)).size;
  const streak = FF.savingStreak();
  const economiaPct = totalIn > 0 ? ((totalIn - totalOut) / totalIn) * 100 : 0;

  const statCards = [
    { l: 'Patrimônio total', v: FF.money(FF.patrimonio()), i: '🏦', sub: 'Saldo + investimentos' },
    { l: 'Maior entrada do período', v: maiorIn ? FF.money(maiorIn.value) : '—', i: '🏔️', sub: maiorIn ? `${maiorIn.desc} · ${FF.dateBR(maiorIn.date)}` : 'Sem registros', cls: 'green' },
    { l: 'Maior gasto do período', v: maiorOut ? FF.money(maiorOut.value) : '—', i: '🌋', sub: maiorOut ? `${maiorOut.desc} · ${FF.dateBR(maiorOut.date)}` : 'Sem registros', cls: 'red' },
    { l: 'Média diária de gastos', v: FF.money(totalOut / nDays), i: '📅', sub: `${nDays} dias de histórico` },
    { l: 'Média semanal de gastos', v: FF.money((totalOut / nDays) * 7), i: '🗓️', sub: 'Projeção pela média diária' },
    { l: 'Média mensal de gastos', v: FF.money(totalOut / nMonths), i: '📆', sub: `${nMonths} meses de histórico` },
    { l: 'Categoria mais cara', v: catOut[0]?.[0] ?? '—', i: '💸', sub: catOut[0] ? FF.money(catOut[0][1]) + ' no total' : '', cls: 'red' },
    { l: 'Categoria mais lucrativa', v: catIn[0]?.[0] ?? '—', i: '💎', sub: catIn[0] ? FF.money(catIn[0][1]) + ' no total' : '', cls: 'green' },
    { l: 'Mês mais econômico', v: fmtMonth(melhorMes?.k), i: '🌱', sub: melhorMes ? 'Saldo de ' + FF.money(melhorMes.saldo) : '' },
    { l: 'Mês mais gastador', v: fmtMonth(piorMes?.k), i: '🔥', sub: piorMes ? FF.money(piorMes.out) + ' em saídas' : '', cls: 'amber' },
    { l: 'Dias economizando (streak)', v: streak + ' dias', i: '🧊', sub: 'Dias seguidos sem gastos' },
    { l: 'Percentual de economia', v: FF.pct(economiaPct), i: '🎚️', sub: `${diasComGasto} dias com gastos registrados` },
  ];

  document.getElementById('kpis').innerHTML = statCards.map(c => `
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">${c.l}</span><span class="kpi-icon ${c.cls || ''}">${c.i}</span></div>
      <div class="kpi-value" style="font-size:19px">${c.v}</div>
      <div class="kpi-sub">${c.sub}</div>
    </div>`).join('');

  /* ---------- Linha temporal financeira ---------- */
  const labels = monthKeys.map(fmtMonth);
  new Chart(document.getElementById('timelineChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Entradas', data: monthKeys.map(k => byMonth[k].in), borderColor: '#22C55E', backgroundColor: 'transparent', tension: .4, borderWidth: 2.5, pointRadius: 3 },
        { label: 'Saídas', data: monthKeys.map(k => byMonth[k].out), borderColor: '#EF4444', backgroundColor: 'transparent', tension: .4, borderWidth: 2.5, pointRadius: 3 },
      ],
    },
    options: { maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$' + v } }, x: { grid: { display: false } } },
      plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${FF.money(c.parsed.y)}` } } } },
  });

  /* ---------- Evolução patrimonial ---------- */
  let acc = 0;
  const patrData = monthKeys.map(k => (acc += byMonth[k].in - byMonth[k].out, acc + FF.investTotal()));
  new Chart(document.getElementById('patrChart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Patrimônio', data: patrData, borderColor: FF.color(), borderWidth: 2.5, tension: .4, pointRadius: 3, fill: true,
      backgroundColor: (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
        g.addColorStop(0, FF.colorRGBA(.22)); g.addColorStop(1, FF.colorRGBA(0));
        return g;
      } }] },
    options: { maintainAspectRatio: false,
      scales: { y: { ticks: { callback: v => 'R$' + v } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${FF.money(c.parsed.y)}` } } } },
  });

  /* ---------- Gastos por categoria (radar + barras) ---------- */
  new Chart(document.getElementById('catBar'), {
    type: 'bar',
    data: { labels: catOut.slice(0, 8).map(c => c[0]),
      datasets: [{ data: catOut.slice(0, 8).map(c => c[1]), backgroundColor: FF.PALETTE, borderRadius: 6, maxBarThickness: 34 }] },
    options: { maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$' + v } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${FF.money(c.parsed.y)}` } } } },
  });

  const radarCats = catOut.slice(0, 6);
  new Chart(document.getElementById('catRadar'), {
    type: 'radar',
    data: { labels: radarCats.map(c => c[0]),
      datasets: [{ label: 'Gastos', data: radarCats.map(c => c[1]),
        borderColor: FF.color(), backgroundColor: FF.colorRGBA(.18), pointBackgroundColor: FF.color(), borderWidth: 2 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { r: { ticks: { display: false }, pointLabels: { font: { size: 11 } } } } },
  });

  /* ---------- Comparativo mensal (últimos 2 meses por categoria) ---------- */
  const now = new Date();
  const kNow = now.toISOString().slice(0, 7);
  const dPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const kPrev = `${dPrev.getFullYear()}-${String(dPrev.getMonth() + 1).padStart(2, '0')}`;
  const catsSet = [...new Set(outs.filter(t => [kNow, kPrev].includes(t.date.slice(0, 7))).map(t => t.category))];
  const sumCat = (k, c) => outs.filter(t => t.date.slice(0, 7) === k && t.category === c).reduce((s, t) => s + t.value, 0);
  new Chart(document.getElementById('compChart'), {
    type: 'bar',
    data: { labels: catsSet,
      datasets: [
        { label: fmtMonth(kPrev), data: catsSet.map(c => sumCat(kPrev, c)), backgroundColor: '#CCD3FF', borderRadius: 6, maxBarThickness: 22 },
        { label: fmtMonth(kNow), data: catsSet.map(c => sumCat(kNow, c)), backgroundColor: FF.color(), borderRadius: 6, maxBarThickness: 22 },
      ] },
    options: { maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$' + v } }, x: { grid: { display: false } } },
      plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${FF.money(c.parsed.y)}` } } } },
  });

  /* ---------- Heatmap financeiro (estilo GitHub) ---------- */
  const outByDay = {};
  for (const t of S.transactions.filter(t => t.type === 'out')) outByDay[t.date] = (outByDay[t.date] || 0) + t.value;

  const dayValues = Object.values(outByDay).sort((a, b) => a - b);
  const q = (p) => dayValues.length ? dayValues[Math.min(dayValues.length - 1, Math.floor(dayValues.length * p))] : 0;
  const q1 = q(.25), q2 = q(.5), q3 = q(.75);

  function level(v) {
    if (!v) return 0;
    if (v <= q1) return 1;
    if (v <= q2) return 2;
    if (v <= q3) return 3;
    return 4;
  }

  let hmMonthOffset = 0; // 0 = janela terminando hoje

  function renderHeatmap() {
    const grid = document.getElementById('heatmap');
    const end = new Date();
    end.setMonth(end.getMonth() - hmMonthOffset * 6);
    const start = new Date(end);
    start.setDate(start.getDate() - 7 * 26); // ~26 semanas
    // alinha ao domingo
    start.setDate(start.getDate() - start.getDay());

    let html = '';
    const d = new Date(start);
    while (d <= end) {
      const iso = d.toISOString().slice(0, 10);
      const v = outByDay[iso] || 0;
      html += `<div class="hm-cell l${level(v)}" title="${FF.dateBR(iso)} — ${v ? FF.money(v) : 'sem gastos'}"></div>`;
      d.setDate(d.getDate() + 1);
    }
    grid.innerHTML = html;
    document.getElementById('hmRange').textContent =
      `${start.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })} → ${end.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}`;
  }

  document.getElementById('hmPrev').onclick = () => { hmMonthOffset++; renderHeatmap(); };
  document.getElementById('hmNext').onclick = () => { if (hmMonthOffset > 0) hmMonthOffset--; renderHeatmap(); };
  renderHeatmap();
})();

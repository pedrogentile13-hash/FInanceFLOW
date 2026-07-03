/* ============================================================
   FinanceFlow — Dashboard executivo
   ============================================================ */

(() => {
  FF.init({
    title: 'Dashboard',
    subtitle: 'Visão executiva das suas finanças',
    actions: `<a class="btn btn-primary" href="entradas.html">＋ Lançamento</a>`,
  });

  const S = FF.state;
  const now = new Date();
  const t = FF.totals();
  const patrimonio = FF.patrimonio();
  const mNow = FF.totals(FF.txMonth(now.getFullYear(), now.getMonth()));
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mPrev = FF.totals(FF.txMonth(prev.getFullYear(), prev.getMonth()));

  const economia = mNow.in > 0 ? ((mNow.in - mNow.out) / mNow.in) * 100 : 0;
  const projRec = S.projetos.reduce((s, p) => s + FF.projTotals(p).receita, 0);
  const li = FF.levelInfo();

  const metaPrincipal = [...S.metas].sort((a, b) =>
    ({ Alta: 0, 'Média': 1, Baixa: 2 }[a.prioridade] ?? 3) - ({ Alta: 0, 'Média': 1, Baixa: 2 }[b.prioridade] ?? 3)
  )[0];

  const delta = (cur, old) => {
    if (!old) return '';
    const d = ((cur - old) / old) * 100;
    const cls = d >= 0 ? 'up' : 'down';
    return `<span class="${cls}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}%</span> vs mês anterior`;
  };

  /* ---------- KPIs ---------- */
  document.getElementById('kpis').innerHTML = `
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">Patrimônio Atual</span><span class="kpi-icon">🏦</span></div>
      <div class="kpi-value">${FF.money(patrimonio)}</div>
      <div class="kpi-sub">Saldo + investimentos</div>
    </div>
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">Saldo Disponível</span><span class="kpi-icon green">💳</span></div>
      <div class="kpi-value">${FF.money(t.saldo)}</div>
      <div class="kpi-sub">Entradas − saídas</div>
    </div>
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">Entradas do Mês</span><span class="kpi-icon green">💵</span></div>
      <div class="kpi-value text-success">${FF.money(mNow.in)}</div>
      <div class="kpi-sub">${delta(mNow.in, mPrev.in) || 'Sem histórico anterior'}</div>
    </div>
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">Saídas do Mês</span><span class="kpi-icon red">💸</span></div>
      <div class="kpi-value text-danger">${FF.money(mNow.out)}</div>
      <div class="kpi-sub">${delta(mNow.out, mPrev.out) || 'Sem histórico anterior'}</div>
    </div>
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">Economia do Mês</span><span class="kpi-icon amber">🌱</span></div>
      <div class="kpi-value">${FF.pct(economia)}</div>
      <div class="kpi-sub">${FF.money(mNow.saldo)} guardados</div>
    </div>
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">Receita dos Projetos</span><span class="kpi-icon">🏗️</span></div>
      <div class="kpi-value">${FF.money(projRec)}</div>
      <div class="kpi-sub">${S.projetos.length} projeto${S.projetos.length === 1 ? '' : 's'} ativos</div>
    </div>
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">Meta Principal</span><span class="kpi-icon amber">🎯</span></div>
      <div class="kpi-value">${metaPrincipal ? FF.pct((metaPrincipal.atual / metaPrincipal.objetivo) * 100) : '—'}</div>
      <div class="kpi-sub">${metaPrincipal ? metaPrincipal.nome : 'Crie sua primeira meta'}</div>
    </div>
    <div class="kpi">
      <div class="kpi-head"><span class="kpi-label">Nível Financeiro</span><span class="kpi-icon">⚡</span></div>
      <div class="kpi-value">Nível ${li.level}</div>
      <div class="kpi-sub">${li.xp} XP acumulados</div>
    </div>`;

  /* ---------- Gráfico Entradas x Saídas (6 meses) ---------- */
  const labels = [], dIn = [], dOut = [], dPatr = [];
  let acc = 0;
  // patrimônio acumulado precisa começar do início da história
  const firstMonths = {};
  for (const tx of S.transactions) {
    const k = tx.date.slice(0, 7);
    firstMonths[k] = firstMonths[k] || { in: 0, out: 0 };
    firstMonths[k][tx.type === 'in' ? 'in' : 'out'] += tx.value;
  }
  const allKeys = Object.keys(firstMonths).sort();
  const last6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  // acumula meses anteriores à janela
  for (const k of allKeys) {
    if (k < last6[0]) acc += firstMonths[k].in - firstMonths[k].out;
  }
  for (const k of last6) {
    const m = firstMonths[k] || { in: 0, out: 0 };
    labels.push(FF.monthName(+k.split('-')[1] - 1));
    dIn.push(m.in);
    dOut.push(m.out);
    acc += m.in - m.out;
    dPatr.push(acc + FF.investTotal());
  }

  new Chart(document.getElementById('flowChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Entradas', data: dIn, backgroundColor: '#22C55E', borderRadius: 6, maxBarThickness: 26 },
        { label: 'Saídas', data: dOut, backgroundColor: '#EF4444', borderRadius: 6, maxBarThickness: 26 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$' + v } }, x: { grid: { display: false } } },
      plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${FF.money(c.parsed.y)}` } } },
    },
  });

  new Chart(document.getElementById('patrChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Patrimônio',
        data: dPatr,
        borderColor: '#2E3BC9',
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
          g.addColorStop(0, 'rgba(46,59,201,.25)');
          g.addColorStop(1, 'rgba(46,59,201,0)');
          return g;
        },
        fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: '#2E3BC9', borderWidth: 2.5,
      }],
    },
    options: {
      maintainAspectRatio: false,
      scales: { y: { ticks: { callback: v => 'R$' + v } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${FF.money(c.parsed.y)}` } } },
    },
  });

  /* ---------- Gastos por categoria ---------- */
  const cats = FF.byCategory('out').slice(0, 7);
  new Chart(document.getElementById('catChart'), {
    type: 'doughnut',
    data: {
      labels: cats.map(c => c[0]),
      datasets: [{ data: cats.map(c => c[1]), backgroundColor: FF.PALETTE, borderWidth: 0, hoverOffset: 8 }],
    },
    options: {
      maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ` ${c.label}: ${FF.money(c.parsed)}` } } },
    },
  });

  /* ---------- Receita por projeto ---------- */
  const projs = S.projetos.map(p => ({ nome: p.nome, rec: FF.projTotals(p).receita }));
  new Chart(document.getElementById('projChart'), {
    type: 'bar',
    data: {
      labels: projs.map(p => p.nome),
      datasets: [{ data: projs.map(p => p.rec), backgroundColor: '#2E3BC9', borderRadius: 8, maxBarThickness: 30 }],
    },
    options: {
      indexAxis: 'y', maintainAspectRatio: false,
      scales: { x: { beginAtZero: true, ticks: { callback: v => 'R$' + v } }, y: { grid: { display: false } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${FF.money(c.parsed.x)}` } } },
    },
  });

  /* ---------- Últimos lançamentos ---------- */
  const last = [...S.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  document.getElementById('lastTx').innerHTML = last.length ? last.map(tx => `
    <div class="list-item">
      <span class="li-icon">${tx.type === 'in' ? '💵' : '💸'}</span>
      <div class="li-main"><b>${esc(tx.desc)}</b><span>${esc(tx.category)} · ${FF.dateBR(tx.date)}</span></div>
      <span class="li-value ${tx.type === 'in' ? 'text-success' : 'text-danger'}">${tx.type === 'in' ? '+' : '−'} ${FF.money(tx.value)}</span>
    </div>`).join('')
    : `<div class="empty"><div class="e-icon">📭</div><h4>Nada por aqui ainda</h4><p>Registre sua primeira movimentação.</p></div>`;

  /* ---------- Próximas metas ---------- */
  const metas = [...S.metas]
    .filter(m => m.atual < m.objetivo)
    .sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'))
    .slice(0, 4);
  document.getElementById('nextMetas').innerHTML = metas.length ? metas.map(m => {
    const p = Math.min(100, (m.atual / m.objetivo) * 100);
    return `
      <div style="margin-bottom:14px">
        <div class="flex-between" style="margin-bottom:6px">
          <b style="font-size:13.5px">🎯 ${esc(m.nome)}</b>
          <span class="muted small">${FF.pct(p)}</span>
        </div>
        <div class="progress ${p >= 75 ? 'green' : p >= 40 ? '' : 'amber'}"><span style="width:${p}%"></span></div>
        <div class="muted small mt-8">${FF.money(m.atual)} de ${FF.money(m.objetivo)} · faltam ${FF.money(m.objetivo - m.atual)}</div>
      </div>`;
  }).join('') : `<div class="empty"><div class="e-icon">🎯</div><h4>Sem metas ativas</h4><p>Defina objetivos e acompanhe aqui.</p></div>`;

  /* ---------- Conquistas recentes ---------- */
  const achs = FF.ACHIEVEMENTS.filter(a => S.achievements.includes(a.id)).slice(-4).reverse();
  document.getElementById('recentAchs').innerHTML = achs.length ? achs.map(a => `
    <div class="list-item">
      <span class="li-icon" style="background:var(--warning-soft)">${a.emoji}</span>
      <div class="li-main"><b>${a.nome}</b><span>${a.desc}</span></div>
    </div>`).join('')
    : `<div class="empty"><div class="e-icon">🏆</div><h4>Nenhuma conquista ainda</h4><p>Use o sistema para desbloquear.</p></div>`;

  /* ---------- Resumo inteligente ---------- */
  const resumo = [];
  if (mNow.saldo > 0) resumo.push(`Você está no <b class="text-success">verde</b> este mês: economizou <b>${FF.money(mNow.saldo)}</b> (${FF.pct(economia)} da receita).`);
  else if (mNow.out > 0) resumo.push(`Atenção: suas saídas superam as entradas em <b class="text-danger">${FF.money(-mNow.saldo)}</b> este mês.`);
  const topCat = FF.byCategory('out')[0];
  if (topCat) resumo.push(`Sua categoria de gasto dominante é <b>${topCat[0]}</b>, com ${FF.money(topCat[1])} no total.`);
  const streak = FF.savingStreak();
  if (streak >= 2) resumo.push(`Sequência atual: <b>${streak} dias</b> sem registrar gastos. 🔥`);
  if (metaPrincipal && mNow.saldo > 0) {
    const falta = metaPrincipal.objetivo - metaPrincipal.atual;
    const meses = Math.ceil(falta / mNow.saldo);
    resumo.push(`Mantendo o ritmo atual, você conclui <b>${esc(metaPrincipal.nome)}</b> em aproximadamente <b>${meses} ${meses === 1 ? 'mês' : 'meses'}</b>.`);
  }
  document.getElementById('smartSummary').innerHTML = resumo.length
    ? resumo.map(r => `<div class="insight"><span class="i-icon">🤖</span><div><small>IA FinanceFlow</small><p>${r}</p></div></div>`).join('')
    : `<div class="empty"><div class="e-icon">🤖</div><h4>Sem dados suficientes</h4><p>Registre movimentações para gerar insights.</p></div>`;

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
})();

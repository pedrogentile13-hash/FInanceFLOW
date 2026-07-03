/* ============================================================
   FinanceFlow — IA Financeira
   Motor de insights por regras (100% local, sem API)
   ============================================================ */

(() => {
  FF.init({
    title: 'IA Financeira',
    subtitle: 'Análises automáticas geradas a partir dos seus dados',
  });

  const S = FF.state;
  const txs = S.transactions;
  const now = new Date();
  const kNow = now.toISOString().slice(0, 7);
  const dPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const kPrev = `${dPrev.getFullYear()}-${String(dPrev.getMonth() + 1).padStart(2, '0')}`;

  const monthTx = (k) => txs.filter(t => t.date.slice(0, 7) === k);
  const sum = (arr, type) => arr.filter(t => !type || t.type === type).reduce((s, t) => s + t.value, 0);
  const catSum = (arr, type) => {
    const m = {};
    for (const t of arr) if (t.type === type) m[t.category] = (m[t.category] || 0) + t.value;
    return m;
  };

  /* ================= MOTOR DE REGRAS ================= */
  const insights = [];
  const add = (kind, icon, tag, text) => insights.push({ kind, icon, tag, text });

  const txNow = monthTx(kNow), txPrev = monthTx(kPrev);
  const inNow = sum(txNow, 'in'), outNow = sum(txNow, 'out');
  const inPrev = sum(txPrev, 'in'), outPrev = sum(txPrev, 'out');
  const patr = FF.patrimonio();

  // 1. Comparações mês a mês por categoria
  const cNow = catSum(txNow, 'out'), cPrev = catSum(txPrev, 'out');
  for (const cat of Object.keys(cNow)) {
    if (cPrev[cat] > 0) {
      const d = ((cNow[cat] - cPrev[cat]) / cPrev[cat]) * 100;
      if (d >= 20) add('bad', '📈', 'Alerta de gasto', `Você gastou <b>${Math.round(d)}% mais</b> em <b>${cat}</b> este mês (${FF.money(cNow[cat])} vs ${FF.money(cPrev[cat])}).`);
      else if (d <= -20) add('good', '📉', 'Boa notícia', `Seus gastos com <b>${cat}</b> caíram <b>${Math.round(-d)}%</b> em relação ao mês passado. Continue assim!`);
    }
  }

  // 2. Crescimento patrimonial
  const saldoPrev = sum(txPrev, 'in') - sum(txPrev, 'out');
  const saldoNow = inNow - outNow;
  if (saldoPrev !== 0 && patr > 0) {
    const crescimento = (saldoNow / Math.max(patr - saldoNow, 1)) * 100;
    if (crescimento > 0) add('good', '🚀', 'Patrimônio', `Seu patrimônio cresceu aproximadamente <b>${FF.pct(crescimento)}</b> este mês.`);
    else if (crescimento < 0) add('bad', '📉', 'Patrimônio', `Seu patrimônio encolheu <b>${FF.pct(-crescimento)}</b> este mês. Hora de revisar os gastos.`);
  }

  // 3. Previsão de metas
  const ecoDia = (() => {
    const cut = new Date(); cut.setDate(cut.getDate() - 90);
    const rec = txs.filter(t => t.date >= cut.toISOString().slice(0, 10));
    return (sum(rec, 'in') - sum(rec, 'out')) / 90;
  })();
  for (const m of S.metas.filter(m => m.atual < m.objetivo).slice(0, 3)) {
    const falta = m.objetivo - m.atual;
    if (ecoDia > 0) {
      const dias = Math.ceil(falta / ecoDia);
      add('good', '🎯', 'Previsão de meta', `Se continuar economizando neste ritmo, você alcança <b>${esc(m.nome)}</b> em <b>${dias} dias</b>.`);
    } else {
      add('warn', '🎯', 'Meta em risco', `No ritmo atual, a meta <b>${esc(m.nome)}</b> não tem previsão de conclusão. Faltam ${FF.money(falta)}.`);
    }
  }

  // 4. Previsão de saldo e patrimônio
  if (ecoDia !== 0 && txs.length > 5) {
    const p30 = patr + ecoDia * 30, p365 = patr + ecoDia * 365;
    add(ecoDia > 0 ? 'good' : 'warn', '🔮', 'Previsão',
      `Projeção: patrimônio de <b>${FF.money(p30)}</b> em 30 dias e <b>${FF.money(p365)}</b> em 1 ano, mantendo o ritmo atual.`);
  }

  // 5. Maior gasto recorrente
  const recorrentes = {};
  for (const t of txs.filter(t => t.type === 'out')) {
    const key = (t.desc || '').toLowerCase().trim();
    if (!key) continue;
    recorrentes[key] = recorrentes[key] || { n: 0, total: 0, cat: t.category };
    recorrentes[key].n++; recorrentes[key].total += t.value;
  }
  const topRec = Object.entries(recorrentes).filter(([, v]) => v.n >= 3).sort((a, b) => b[1].total - a[1].total)[0];
  if (topRec) add('warn', '🔁', 'Gasto recorrente', `Seu maior gasto recorrente é <b>${esc(topRec[0])}</b>: ${topRec[1].n}x, totalizando <b>${FF.money(topRec[1].total)}</b>.`);

  // 6. Percentual de economia do mês
  if (inNow > 0) {
    const eco = ((inNow - outNow) / inNow) * 100;
    if (eco >= 30) add('good', '🏆', 'Economia', `Excelente! Você está economizando <b>${FF.pct(eco)}</b> da sua renda este mês — acima da regra dos 20%.`);
    else if (eco >= 0) add('warn', '⚖️', 'Economia', `Você está economizando <b>${FF.pct(eco)}</b> da renda. A recomendação clássica é guardar pelo menos 20%.`);
    else add('bad', '🚨', 'Déficit', `Você está gastando <b>${FF.money(outNow - inNow)}</b> a mais do que ganha este mês.`);
  }

  // 7. Streak
  const streak = FF.savingStreak();
  if (streak >= 3) add('good', '🔥', 'Sequência', `Você está há <b>${streak} dias</b> sem registrar gastos. Recorde em construção!`);

  // 8. Concentração de gastos
  const catTotals = Object.entries(catSum(txs, 'out')).sort((a, b) => b[1] - a[1]);
  const totalOut = sum(txs, 'out');
  if (catTotals[0] && totalOut > 0) {
    const p = (catTotals[0][1] / totalOut) * 100;
    if (p > 40) add('warn', '🎯', 'Concentração', `<b>${FF.pct(p)}</b> de todos os seus gastos estão em <b>${catTotals[0][0]}</b>. Diversificar o orçamento reduz riscos.`);
  }

  // 9. Investimentos parados
  if (S.investimentos.length === 0 && patr > 500) {
    add('warn', '💤', 'Oportunidade', `Você tem <b>${FF.money(patr)}</b> parados sem investir. Mesmo 100% do CDI já faria seu dinheiro trabalhar.`);
  }

  // 10. Fim de semana vs dias úteis
  const wkd = txs.filter(t => t.type === 'out' && [0, 6].includes(new Date(t.date + 'T00:00').getDay()));
  if (totalOut > 0 && wkd.length) {
    const p = (sum(wkd) / totalOut) * 100;
    if (p > 40) add('warn', '🎉', 'Padrão detectado', `<b>${FF.pct(p)}</b> dos seus gastos acontecem aos fins de semana. Planejar o lazer com antecedência ajuda.`);
  }

  if (!insights.length) add('good', '🤖', 'Tudo certo', 'Ainda não há dados suficientes para gerar análises profundas. Registre suas movimentações diariamente!');

  document.getElementById('insights').innerHTML = insights.map((i, idx) => `
    <div class="insight ${i.kind}" style="animation-delay:${idx * 60}ms">
      <span class="i-icon">${i.icon}</span>
      <div><small>${i.tag}</small><p>${i.text}</p></div>
    </div>`).join('');

  /* ================= DETECTOR DE GASTOS INÚTEIS ================= */
  const waste = [];
  // impulsivos: 2+ gastos pequenos (<R$60) no mesmo dia
  const byDay = {};
  for (const t of txs.filter(t => t.type === 'out' && t.value < 60)) {
    byDay[t.date] = byDay[t.date] || [];
    byDay[t.date].push(t);
  }
  const impulsivos = Object.values(byDay).filter(a => a.length >= 2).flat();
  if (impulsivos.length) {
    const tot = sum(impulsivos);
    waste.push({ icon: '🛍️', text: `Detectamos <b>${impulsivos.length} possíveis compras impulsivas</b> (vários gastos pequenos no mesmo dia), somando <b>${FF.money(tot)}</b>.` });
  }
  // categorias de lazer altas
  for (const cat of ['Jogos', 'Streaming', 'Alimentação']) {
    const catTx = txs.filter(t => t.type === 'out' && t.category === cat);
    const tot = sum(catTx);
    if (tot > 0 && totalOut > 0 && tot / totalOut > 0.15) {
      const anual = (tot / Math.max(1, new Set(txs.map(t => t.date.slice(0, 7))).size)) * 12;
      waste.push({ icon: '✂️', text: `Reduzindo <b>10%</b> dos gastos com <b>${cat}</b>, você economizaria cerca de <b>${FF.money(anual * 0.1)}</b> por ano.` });
    }
  }
  if (topRec && topRec[1].total > totalOut * 0.1) {
    waste.push({ icon: '🔁', text: `O gasto recorrente "<b>${esc(topRec[0])}</b>" já consumiu <b>${FF.money(topRec[1].total)}</b>. Ele ainda vale a pena?` });
  }
  document.getElementById('waste').innerHTML = waste.length
    ? waste.map(w => `<div class="insight warn"><span class="i-icon">${w.icon}</span><div><small>Detector de desperdício</small><p>${w.text}</p></div></div>`).join('')
    : `<div class="insight good"><span class="i-icon">✨</span><div><small>Detector de desperdício</small><p>Nenhum padrão de desperdício relevante detectado. Parabéns pela disciplina!</p></div></div>`;

  /* ================= RESUMOS ================= */
  function resumoPeriodo(dias, nome) {
    const cut = new Date(); cut.setDate(cut.getDate() - dias);
    const rec = txs.filter(t => t.date >= cut.toISOString().slice(0, 10));
    const i = sum(rec, 'in'), o = sum(rec, 'out');
    const topCat = Object.entries(catSum(rec, 'out')).sort((a, b) => b[1] - a[1])[0];
    return `<b>${nome}</b>: entradas de <b class="text-success">${FF.money(i)}</b>, saídas de <b class="text-danger">${FF.money(o)}</b>, ` +
      `resultado de <b>${FF.money(i - o)}</b>.` +
      (topCat ? ` Maior categoria de gasto: <b>${topCat[0]}</b> (${FF.money(topCat[1])}).` : '');
  }
  document.getElementById('resumos').innerHTML = [
    ['📅', 'Resumo semanal', resumoPeriodo(7, 'Últimos 7 dias')],
    ['🗓️', 'Resumo mensal', resumoPeriodo(30, 'Últimos 30 dias')],
    ['📆', 'Resumo anual', resumoPeriodo(365, 'Últimos 12 meses')],
  ].map(([icon, tag, text]) => `
    <div class="insight"><span class="i-icon">${icon}</span><div><small>${tag}</small><p>${text}</p></div></div>`).join('');

  /* ================= CHAT ================= */
  const chatBox = document.getElementById('chatBox');
  const chatInput = document.getElementById('chatInput');

  function botAnswer(q) {
    q = q.toLowerCase();
    const t = FF.totals();
    if (/saldo|quanto.*tenho|dispon/.test(q)) return `Seu saldo disponível é <b>${FF.money(t.saldo)}</b> e seu patrimônio total (com investimentos) é <b>${FF.money(patr)}</b>.`;
    if (/patrim/.test(q)) return `Seu patrimônio total é <b>${FF.money(patr)}</b>: ${FF.money(t.saldo)} em saldo + ${FF.money(FF.investTotal())} investidos.`;
    if (/gast(ei|o|os)|sa[íi]da/.test(q)) {
      const topCat = catTotals[0];
      return `Você já gastou <b>${FF.money(totalOut)}</b> no total, sendo <b>${FF.money(outNow)}</b> este mês.` +
        (topCat ? ` Sua categoria mais cara é <b>${topCat[0]}</b>.` : '');
    }
    if (/entrad|recebi|ganhei|receita/.test(q)) return `Suas entradas somam <b>${FF.money(sum(txs, 'in'))}</b> no total — <b>${FF.money(inNow)}</b> este mês.`;
    if (/meta/.test(q)) {
      const ativas = S.metas.filter(m => m.atual < m.objetivo);
      if (!ativas.length) return 'Você não tem metas ativas no momento. Que tal criar uma na página Metas?';
      return `Você tem <b>${ativas.length}</b> meta(s) ativa(s): ` + ativas.map(m =>
        `<b>${esc(m.nome)}</b> (${FF.pct((m.atual / m.objetivo) * 100)})`).join(', ') + '.';
    }
    if (/sonho/.test(q)) {
      if (!S.sonhos.length) return 'Nenhum sonho cadastrado ainda. A página Sonhos está esperando por você! ✨';
      return `Seus sonhos: ` + S.sonhos.map(d => `${d.emoji} <b>${esc(d.nome)}</b> (${FF.pct(Math.min(100, (d.acumulado / d.valor) * 100))})`).join(', ') + '.';
    }
    if (/invest/.test(q)) return `Você tem <b>${FF.money(FF.investTotal())}</b> investidos em ${S.investimentos.length} aplicação(ões).`;
    if (/projet|empresa|neg[óo]cio/.test(q)) {
      const rec = S.projetos.reduce((s, p) => s + FF.projTotals(p).receita, 0);
      return `Seus ${S.projetos.length} projetos já geraram <b>${FF.money(rec)}</b> em receita.`;
    }
    if (/economi|guard/.test(q)) {
      return inNow > 0
        ? `Este mês você economizou <b>${FF.money(inNow - outNow)}</b> (${FF.pct(((inNow - outNow) / inNow) * 100)} da renda).`
        : 'Ainda não há entradas este mês para calcular sua economia.';
    }
    if (/n[íi]vel|xp|conquist/.test(q)) {
      const li = FF.levelInfo();
      return `Você está no <b>nível ${li.level}</b> com ${li.xp} XP e ${S.achievements.length} conquista(s) desbloqueada(s). 🏆`;
    }
    if (/previs|futuro|quando/.test(q)) {
      if (ecoDia > 0) return `No ritmo atual (${FF.money(ecoDia)}/dia de economia), seu patrimônio chegará a <b>${FF.money(patr + ecoDia * 365)}</b> em 1 ano.`;
      return 'Seu ritmo de economia recente está negativo — não consigo prever crescimento por enquanto.';
    }
    if (/ol[áa]|oi|hey|bom dia|boa tarde|boa noite/.test(q)) return 'Olá! 👋 Sou a IA do FinanceFlow. Pergunte sobre seu saldo, gastos, metas, sonhos, investimentos ou previsões.';
    return 'Posso responder sobre: <b>saldo</b>, <b>patrimônio</b>, <b>gastos</b>, <b>entradas</b>, <b>metas</b>, <b>sonhos</b>, <b>investimentos</b>, <b>projetos</b>, <b>economia</b>, <b>nível/XP</b> e <b>previsões</b>. Experimente: "quanto gastei este mês?"';
  }

  function pushMsg(text, who) {
    const el = document.createElement('div');
    el.className = `chat-msg ${who}`;
    el.innerHTML = text;
    chatBox.appendChild(el);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function sendChat() {
    const q = chatInput.value.trim();
    if (!q) return;
    pushMsg(esc(q), 'user');
    chatInput.value = '';
    setTimeout(() => pushMsg(botAnswer(q), 'bot'), 350);
  }
  document.getElementById('chatSend').onclick = sendChat;
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
  pushMsg('Olá! 👋 Sou a IA do FinanceFlow. Pergunte algo como <b>"quanto gastei este mês?"</b> ou <b>"quando alcanço minha meta?"</b>', 'bot');

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
})();

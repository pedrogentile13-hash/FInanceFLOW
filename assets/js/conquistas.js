/* ============================================================
   FinanceFlow — Conquistas & Gamificação
   ============================================================ */

(() => {
  FF.init({
    title: 'Conquistas',
    subtitle: 'Seu progresso vale XP — e XP vira nível',
  });

  FF.checkAchievements();

  const S = FF.state;
  const li = FF.levelInfo();
  const unlocked = FF.ACHIEVEMENTS.filter(a => S.achievements.includes(a.id));
  const locked = FF.ACHIEVEMENTS.filter(a => !S.achievements.includes(a.id));

  document.getElementById('kpis').innerHTML = `
    <div class="kpi"><div class="kpi-head"><span class="kpi-label">Nível atual</span><span class="kpi-icon amber">⚡</span></div>
      <div class="kpi-value">Nível ${li.level}</div>
      <div class="kpi-sub">${li.xp} XP acumulados</div></div>
    <div class="kpi"><div class="kpi-head"><span class="kpi-label">Próximo nível</span><span class="kpi-icon">🎯</span></div>
      <div class="kpi-value">${li.next - li.xp} XP</div>
      <div class="kpi-sub">Faltam para o nível ${li.level + 1}</div></div>
    <div class="kpi"><div class="kpi-head"><span class="kpi-label">Conquistas</span><span class="kpi-icon green">🏆</span></div>
      <div class="kpi-value">${unlocked.length}/${FF.ACHIEVEMENTS.length}</div>
      <div class="kpi-sub">${FF.pct((unlocked.length / FF.ACHIEVEMENTS.length) * 100)} completo</div></div>
    <div class="kpi"><div class="kpi-head"><span class="kpi-label">Sequência econômica</span><span class="kpi-icon">🔥</span></div>
      <div class="kpi-value">${FF.savingStreak()} dias</div>
      <div class="kpi-sub">Sem registrar gastos</div></div>`;

  // barra de nível grande
  document.getElementById('levelBar').innerHTML = `
    <div class="flex-between" style="margin-bottom:10px">
      <b style="font-size:15px">⚡ Nível ${li.level}</b>
      <span class="muted small">${li.xp - li.base} / ${li.next - li.base} XP nesta etapa</span>
    </div>
    <div class="progress" style="height:12px"><span style="width:${li.progress}%"></span></div>
    <div class="muted small mt-8">Ganhe XP registrando movimentações (+10), aportando em metas (+15), criando projetos (+30) e desbloqueando conquistas (+50).</div>`;

  // missões (como ganhar XP)
  const missions = [
    ['✍️', 'Registrar uma movimentação', '+10 XP'],
    ['💰', 'Aportar em uma meta ou sonho', '+15 XP'],
    ['🎯', 'Criar uma nova meta', '+20 XP'],
    ['📈', 'Fazer um investimento', '+25 XP'],
    ['🏗️', 'Criar um projeto', '+30 XP'],
    ['🏁', 'Concluir uma meta', '+100 XP'],
    ['🌟', 'Realizar um sonho', '+150 XP'],
    ['🏆', 'Desbloquear qualquer conquista', '+50 XP'],
  ];
  document.getElementById('missions').innerHTML = missions.map(([e, t, xp]) => `
    <div class="list-item">
      <span class="li-icon">${e}</span>
      <div class="li-main"><b>${t}</b></div>
      <span class="badge amber">${xp}</span>
    </div>`).join('');

  // grids
  document.getElementById('unlockedGrid').innerHTML = unlocked.length
    ? unlocked.map(a => `
      <div class="ach">
        <span class="ach-emoji">${a.emoji}</span>
        <div><h4>${a.nome}</h4><p>${a.desc}</p></div>
      </div>`).join('')
    : `<div class="empty" style="grid-column:1/-1"><div class="e-icon">🔓</div><h4>Nada desbloqueado ainda</h4><p>Use o sistema e as conquistas virão.</p></div>`;

  document.getElementById('lockedGrid').innerHTML = locked.map(a => `
    <div class="ach locked">
      <span class="ach-emoji">🔒</span>
      <div><h4>${a.nome}</h4><p>${a.desc}</p></div>
    </div>`).join('') || `<div class="empty" style="grid-column:1/-1"><div class="e-icon">👑</div><h4>Você desbloqueou tudo!</h4><p>Lendário.</p></div>`;
})();

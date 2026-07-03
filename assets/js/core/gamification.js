/* ============================================================
   FinanceFlow · core/gamification.js
   XP, níveis, conquistas e sequência de economia.
   ============================================================ */

(function (FF) {
  'use strict';

  FF.LEVELS = (() => {
    // Nível 1 = 0 XP, depois crescimento progressivo de 25%
    const arr = [0];
    let need = 100;
    for (let i = 1; i < 60; i++) { arr.push(arr[i - 1] + need); need = Math.round(need * 1.25); }
    return arr;
  })();

  FF.levelInfo = () => {
    const xp = FF.state.xp;
    let lvl = 1;
    while (lvl < FF.LEVELS.length && xp >= FF.LEVELS[lvl]) lvl++;
    const base = FF.LEVELS[lvl - 1];
    const next = FF.LEVELS[lvl] ?? base + 1;
    return { level: lvl, xp, base, next, progress: Math.min(100, ((xp - base) / (next - base)) * 100) };
  };

  FF.addXP = (amount, reason) => {
    const before = FF.levelInfo().level;
    FF.state.xp += amount;
    FF.save();
    FF.toast(`+${amount} XP — ${reason}`, 'xp', '⚡');
    const after = FF.levelInfo().level;
    if (after > before) FF.toast(`Você subiu para o nível ${after}! 🎉`, 'success', '🏆');
    FF.renderLevelChip();
    FF.checkAchievements();
  };

  FF.savingStreak = () => {
    const outs = new Set(FF.state.transactions.filter(t => t.type === 'out').map(t => t.date));
    if (!FF.state.transactions.length) return 0;
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const iso = d.toISOString().slice(0, 10);
      if (outs.has(iso)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  FF.ACHIEVEMENTS = [
    { id: 'first_tx',   emoji: '✍️', nome: 'Primeiro Registro', desc: 'Registre sua primeira movimentação', test: s => s.transactions.length >= 1 },
    { id: 'tx_50',      emoji: '📚', nome: 'Historiador', desc: 'Registre 50 movimentações', test: s => s.transactions.length >= 50 },
    { id: 'r100',       emoji: '💵', nome: 'Primeiros R$100', desc: 'Alcance R$100 de patrimônio', test: () => FF.patrimonio() >= 100 },
    { id: 'r500',       emoji: '💰', nome: 'Primeiros R$500', desc: 'Alcance R$500 de patrimônio', test: () => FF.patrimonio() >= 500 },
    { id: 'r1000',      emoji: '🤑', nome: 'Primeiros R$1.000', desc: 'Alcance R$1.000 de patrimônio', test: () => FF.patrimonio() >= 1000 },
    { id: 'r5000',      emoji: '🏦', nome: 'Patrimônio R$5.000', desc: 'Alcance R$5.000 de patrimônio', test: () => FF.patrimonio() >= 5000 },
    { id: 'first_meta', emoji: '🎯', nome: 'Primeira Meta', desc: 'Crie sua primeira meta', test: s => s.metas.length >= 1 },
    { id: 'meta_done',  emoji: '🏁', nome: 'Meta Concluída', desc: 'Complete 100% de uma meta', test: s => s.metas.some(m => m.atual >= m.objetivo && m.objetivo > 0) },
    { id: 'first_dream',emoji: '✨', nome: 'Sonhador', desc: 'Cadastre seu primeiro sonho', test: s => s.sonhos.length >= 1 },
    { id: 'dream_done', emoji: '🌟', nome: 'Sonho Realizado', desc: 'Complete 100% de um sonho', test: s => s.sonhos.some(d => d.acumulado >= d.valor && d.valor > 0) },
    { id: 'first_inv',  emoji: '📈', nome: 'Investidor Iniciante', desc: 'Faça seu primeiro investimento', test: s => s.investimentos.length >= 1 },
    { id: 'inv_1000',   emoji: '🚀', nome: 'Carteira Sólida', desc: 'Invista R$1.000 no total', test: () => FF.investTotal() >= 1000 },
    { id: 'first_proj', emoji: '🏗️', nome: 'Empreendedor', desc: 'Crie seu primeiro projeto', test: s => s.projetos.length >= 1 },
    { id: 'proj_profit',emoji: '💼', nome: 'Primeira Venda', desc: 'Registre receita em um projeto', test: s => s.projetos.some(p => FF.projTotals(p).receita > 0) },
    { id: 'save_streak',emoji: '🔥', nome: '7 Dias Economizando', desc: 'Fique 7 dias seguidos sem gastos', test: () => FF.savingStreak() >= 7 },
    { id: 'save_30',    emoji: '🧊', nome: '30 Dias Economizando', desc: 'Fique 30 dias seguidos sem gastos', test: () => FF.savingStreak() >= 30 },
    { id: 'lvl5',       emoji: '🥉', nome: 'Nível 5', desc: 'Alcance o nível 5', test: () => FF.levelInfo().level >= 5 },
    { id: 'lvl10',      emoji: '🥈', nome: 'Nível 10', desc: 'Alcance o nível 10', test: () => FF.levelInfo().level >= 10 },
    { id: 'lvl20',      emoji: '🥇', nome: 'Nível 20', desc: 'Alcance o nível 20', test: () => FF.levelInfo().level >= 20 },
    { id: 'eco_month',  emoji: '🌱', nome: 'Mês no Verde', desc: 'Feche um mês com saldo positivo', test: () => {
        const now = new Date(); const t = FF.totals(FF.txMonth(now.getFullYear(), now.getMonth()));
        return t.in > 0 && t.saldo > 0;
      } },
  ];

  FF.checkAchievements = () => {
    let unlocked = false;
    for (const a of FF.ACHIEVEMENTS) {
      if (FF.state.achievements.includes(a.id)) continue;
      try {
        if (a.test(FF.state)) {
          FF.state.achievements.push(a.id);
          unlocked = true;
          FF.toast(`Conquista desbloqueada: ${a.nome}`, 'success', a.emoji);
          FF.state.xp += 50;
        }
      } catch (e) { /* regra com dados incompletos não pode travar o app */ }
    }
    if (unlocked) { FF.save(); FF.renderLevelChip(); }
  };
})(window.FF);

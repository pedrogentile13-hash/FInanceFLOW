/* ============================================================
   FinanceFlow · core/utils.js
   Helpers puros + formatação sensível às configurações.
   Cria o namespace global FF; os demais módulos o estendem.
   As funções leem FF.state em tempo de execução (lazy), por
   isso este arquivo pode ser carregado antes do store.
   ============================================================ */

window.FF = window.FF || {};

(function (FF) {
  'use strict';

  FF.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  FF.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- configurações de formato (com defaults seguros) ---------- */
  const cfg = () => (FF.state && FF.state.settings) || {};
  const locale = () => cfg().locale || 'pt-BR';
  const currency = () => cfg().currency || 'BRL';

  FF.money = (v) => {
    const n = Number(v) || 0;
    try {
      return new Intl.NumberFormat(locale(), {
        style: 'currency', currency: currency(),
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(n).replace(/ /g, ' ');
    } catch (e) {
      return 'R$ ' + n.toFixed(2);
    }
  };

  FF.dateBR = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    switch (cfg().dateFormat) {
      case 'mdy': return `${m}/${d}/${y}`;
      case 'ymd': return `${y}-${m}-${d}`;
      default:    return `${d}/${m}/${y}`;
    }
  };

  const MONTHS = {
    'pt-BR': ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    'en-US': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  };
  FF.monthName = (i) => (MONTHS[locale()] || MONTHS['pt-BR'])[i];

  FF.todayISO = () => new Date().toISOString().slice(0, 10);

  FF.pct = (v) => (Number(v) || 0).toLocaleString(locale(), { maximumFractionDigits: 1 }) + '%';

  /* ---------- traduções mínimas do chrome (sidebar/base) ---------- */
  const STRINGS = {
    'pt-BR': {
      general: 'Geral', planning: 'Planejamento', intelligence: 'Inteligência', system: 'Sistema',
      investBrand: 'FinanceFlow Investments', enterpriseBrand: 'FinanceFlow Enterprise',
      dashboard: 'Dashboard', in: 'Entradas', out: 'Saídas', goals: 'Metas', dreams: 'Sonhos',
      invest: 'Investimentos', projects: 'Empresas', stats: 'Estatísticas', ai: 'IA Financeira',
      sim: 'Simulador', achievements: 'Conquistas', settings: 'Configurações',
      level: 'Nível', export: 'Exportar backup', import: 'Importar backup',
      login: 'Entrar / Criar conta', logout: 'Sair', guest: 'Visitante',
    },
    'en-US': {
      general: 'General', planning: 'Planning', intelligence: 'Intelligence', system: 'System',
      investBrand: 'FinanceFlow Investments', enterpriseBrand: 'FinanceFlow Enterprise',
      dashboard: 'Dashboard', in: 'Income', out: 'Expenses', goals: 'Goals', dreams: 'Dreams',
      invest: 'Investments', projects: 'Businesses', stats: 'Statistics', ai: 'Finance AI',
      sim: 'Simulator', achievements: 'Achievements', settings: 'Settings',
      level: 'Level', export: 'Export backup', import: 'Import backup',
      login: 'Sign in / Sign up', logout: 'Sign out', guest: 'Guest',
    },
  };
  FF.t = (key) => (STRINGS[locale()] || STRINGS['pt-BR'])[key] || key;

  /* ---------- cor principal em runtime (para os gráficos) ---------- */
  FF.color = (name = '--primary-500') =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#2E3BC9';

  FF.colorRGBA = (alpha, name = '--primary-500') => {
    const hex = FF.color(name).replace('#', '');
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const int = parseInt(full, 16);
    return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
  };
})(window.FF);

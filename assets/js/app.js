/* ============================================================
   FinanceFlow · app.js — compositor
   Os módulos em core/ já montaram o namespace FF:
   utils → store → gamification → ui → auth → sync
   Aqui fica apenas a inicialização de página.
   ============================================================ */

(function (FF) {
  'use strict';

  FF.init = ({ title, subtitle, actions = '' } = {}) => {
    FF.applyTheme();
    // dados de demonstração só para quem está navegando sem conta —
    // contas novas (locais ou em nuvem) sempre começam zeradas
    if (!FF.session()) FF.seedDemo();
    FF.renderSidebar();
    if (title) FF.renderTopbar(title, subtitle, actions);
    FF.chartDefaults();
    document.addEventListener('ff:theme', FF.chartDefaults);
    FF.initSync(); // no-op sem Supabase configurado
    FF.registerSW();
  };
})(window.FF);

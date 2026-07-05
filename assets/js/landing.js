/* ============================================================
   FinanceFlow — Landing (index.html)
   Tema, recursos, modal de conta (login/cadastro) e PWA.
   ============================================================ */

(() => {
  FF.applyTheme();
  FF.registerSW('sw.js');

  /* ---------- tema ---------- */
  const themeBtn = document.getElementById('lpTheme');
  const paintTheme = () => themeBtn.innerHTML = FF.icon(FF.state.settings.theme === 'dark' ? 'sun' : 'moon');
  themeBtn.onclick = () => {
    FF.state.settings.theme = FF.state.settings.theme === 'dark' ? 'light' : 'dark';
    FF.save();
    FF.applyTheme();
    paintTheme();
  };
  paintTheme();

  /* ---------- recursos (ícones SVG, sem emoji) ---------- */
  const FEATURES = [
    ['grid', 'Dashboard Executivo', 'Patrimônio, fluxo de caixa, economia e metas em uma visão de CEO — atualizada em tempo real.'],
    ['trending-up', 'Entradas & Saídas', 'Controle completo com categorias personalizáveis, formas de pagamento, filtros e gráficos.'],
    ['pie-chart', 'Estatísticas Avançadas', 'Recordes históricos, médias diárias, comparativos mensais e heatmap de gastos.'],
    ['target', 'Metas Inteligentes', 'Prazos, prioridades, barras de progresso e previsão automática de conclusão.'],
    ['star', 'Painel de Sonhos', 'Visualize cada sonho, acompanhe o acumulado e saiba exatamente quando ele se realiza.'],
    ['cpu', 'IA Financeira', 'Insights automáticos, detector de desperdícios, previsões e um chat sobre seus dados.'],
    ['briefcase', 'Gestão de Projetos', 'Cada projeto vira um mini negócio: receita, custos, lucro, MRR, ARR e runway.'],
    ['calculator', 'Simuladores', 'Juros compostos, calculadora de compra, ROI, CAC, LTV, break even e preço ideal.'],
    ['award', 'Gamificação', 'XP, níveis, conquistas e sequências de economia. Progresso que dá vontade de manter.'],
  ];
  document.getElementById('featureGrid').innerHTML = FEATURES.map(([ic, t, d]) => `
    <div class="feature">
      <div class="f-icon">${FF.icon(ic, 21)}</div>
      <h3>${t}</h3><p>${d}</p>
    </div>`).join('');

  document.querySelectorAll('.insight .i-icon[data-ic]').forEach(el => {
    el.innerHTML = FF.icon(el.dataset.ic, 16);
  });

  /* ---------- modal de conta ---------- */
  const modal = document.getElementById('authModal');
  const tabs = document.querySelectorAll('.auth-tabs button');
  const forms = { login: formLogin, register: formRegister };

  function openAuth(tab = 'login') {
    if (FF.session()) { location.href = 'pages/dashboard.html'; return; }
    modal.classList.add('open');
    setTab(tab);
  }
  function closeAuth() { modal.classList.remove('open'); }

  function setTab(tab) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    for (const [k, f] of Object.entries(forms)) f.style.display = k === tab ? '' : 'none';
    document.getElementById('authTitle').textContent = tab === 'login' ? 'Entrar' : 'Criar conta';
  }

  tabs.forEach(t => t.onclick = () => setTab(t.dataset.tab));
  document.querySelectorAll('[data-auth]').forEach(b => b.onclick = () => openAuth(b.dataset.auth));
  document.getElementById('authClose').onclick = closeAuth;
  modal.addEventListener('click', e => { if (e.target === modal) closeAuth(); });

  const isCloud = FF.authMode() === 'supabase';
  document.getElementById('authModeHint').textContent = isCloud
    ? 'Conta em nuvem — sincroniza automaticamente entre dispositivos.'
    : 'Conta local — seus dados ficam neste dispositivo. Ative a nuvem em Configurações.';

  // abre direto se veio de #conta (ex.: link da sidebar ou logout)
  if (location.hash === '#conta') openAuth('login');
  // retorno do OAuth Google
  if (isCloud) FF.resolveOAuth().then(ok => { if (ok) location.href = 'pages/dashboard.html'; });

  const busy = (form, on) => form.querySelectorAll('button, input').forEach(el => el.disabled = on);

  formLogin.onsubmit = async (e) => {
    e.preventDefault();
    busy(formLogin, true);
    if (isCloud) await FF.loadSupabaseSDK();
    const r = await FF.login({
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPass').value,
    });
    busy(formLogin, false);
    if (!r.ok) return FF.toast(r.error, 'error');
    location.href = 'pages/dashboard.html';
  };

  formRegister.onsubmit = async (e) => {
    e.preventDefault();
    busy(formRegister, true);
    if (isCloud) await FF.loadSupabaseSDK();
    const r = await FF.register({
      nome: document.getElementById('regNome').value.trim(),
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPass').value,
    });
    busy(formRegister, false);
    if (!r.ok) return FF.toast(r.error, 'error');
    FF.toast('Conta criada. Bem-vindo!', 'success');
    setTimeout(() => location.href = 'pages/dashboard.html', 600);
  };

  document.getElementById('btnGoogle').onclick = async () => {
    if (isCloud) await FF.loadSupabaseSDK();
    const r = await FF.loginWithGoogle();
    if (!r.ok) FF.toast(r.error, 'error');
  };

  /* ---------- instalação PWA na landing ---------- */
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    document.getElementById('btnInstallLp').style.display = '';
  });
  document.getElementById('btnInstallLp').onclick = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') document.getElementById('btnInstallLp').style.display = 'none';
    deferred = null;
  };
})();

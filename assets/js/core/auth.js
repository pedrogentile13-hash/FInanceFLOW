/* ============================================================
   FinanceFlow · core/auth.js
   Autenticação com dois provedores:
   · local  — contas offline no navegador (padrão)
   · supabase — e-mail/senha, Google OAuth e recuperação por
     e-mail, ativado quando o Supabase está configurado.
   ============================================================ */

(function (FF) {
  'use strict';

  const USERS_KEY = 'financeflow_users';
  const SB_CFG_KEY = 'financeflow_supabase';

  // Projeto Supabase padrão do FinanceFlow — ativo para todo mundo por
  // padrão, sem precisar colar credenciais em Configurações. A anon key
  // é pública por natureza (protegida pelas policies de RLS do projeto,
  // ver supabase/schema.sql); pode ser trocada por um projeto próprio
  // em Configurações → Nuvem.
  const DEFAULT_SUPABASE = {
    url: 'https://sembfpebrbszmpiqqbcb.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbWJmcGVicmJzem1waXFxYmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyODk3MTksImV4cCI6MjA5ODg2NTcxOX0.yddai8Sm_InjW13JFhHksFS0qQmIBkkIeova_-MCC7Y',
  };

  /* ---------- configuração do Supabase ---------- */
  // localStorage pode conter: nada (usa o padrão), {disabled:true}
  // (usuário desativou a nuvem, força modo local) ou {url,anonKey}
  // (projeto Supabase próprio, substitui o padrão).
  FF.supabaseConfig = () => {
    try {
      const c = JSON.parse(localStorage.getItem(SB_CFG_KEY));
      if (c && c.disabled) return null;
      if (c && c.url && c.anonKey) return c;
    } catch (e) { /* localStorage inválido, cai para o padrão */ }
    return DEFAULT_SUPABASE;
  };
  FF.isDefaultSupabase = () => {
    try {
      const c = JSON.parse(localStorage.getItem(SB_CFG_KEY));
      return !(c && (c.disabled || (c.url && c.anonKey)));
    } catch (e) { return true; }
  };
  FF.setSupabaseConfig = (cfg) => {
    if (cfg) localStorage.setItem(SB_CFG_KEY, JSON.stringify(cfg));
    else localStorage.setItem(SB_CFG_KEY, JSON.stringify({ disabled: true }));
  };
  FF.useDefaultSupabase = () => localStorage.removeItem(SB_CFG_KEY);

  let sbClient = null;
  FF.supabase = () => {
    const cfg = FF.supabaseConfig();
    if (!cfg || typeof window.supabase === 'undefined') return null;
    if (!sbClient) sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return sbClient;
  };

  // prefixo relativo: páginas do app vivem em /pages, a landing na raiz
  const root = () => (location.pathname.includes('/pages/') ? '../' : '');

  // carrega o SDK local só quando há configuração (evita 250KB à toa)
  FF.loadSupabaseSDK = () => new Promise((resolve) => {
    if (!FF.supabaseConfig()) return resolve(false);
    if (typeof window.supabase !== 'undefined') return resolve(true);
    const s = document.createElement('script');
    s.src = root() + 'assets/vendor/supabase.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });

  FF.authMode = () => (FF.supabaseConfig() ? 'supabase' : 'local');

  /* ---------- hashing (modo local) ---------- */
  async function hash(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // fallback para contextos sem SubtleCrypto (ex.: file://) — dados são locais
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  }

  function localUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch (e) { return []; }
  }

  // traduz erros técnicos de rede do supabase-js para uma mensagem legível
  function friendlyAuthError(message) {
    if (/failed to fetch|network|load failed|ERR_/i.test(message || '')) {
      return 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.';
    }
    if (/invalid login credentials/i.test(message || '')) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(message || '')) return 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada (e o spam).';
    if (/user already registered/i.test(message || '')) return 'Este e-mail já possui conta.';
    if (/rate limit/i.test(message || '')) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
    return message || 'Ocorreu um erro inesperado.';
  }
  function saveLocalUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

  const normEmail = (e) => String(e || '').trim().toLowerCase();

  // mantém a tabela pública `profiles` em dia (o trigger do schema cobre
  // cadastros novos; este upsert cobre contas anteriores ao trigger e
  // mudanças de nome). Nunca pode quebrar o fluxo de login.
  async function upsertProfile(userId, nome, email) {
    try {
      const sb = FF.supabase();
      if (!sb) return;
      await sb.from('profiles').upsert({ user_id: userId, nome, email });
    } catch (e) { /* perfil é espelho, não crítico */ }
  }

  /* ---------- API pública ---------- */

  // cadastro → {ok, recoveryCode?} | {ok:false, error}
  FF.register = async ({ nome, email, password }) => {
    email = normEmail(email);
    if (!nome || !email || !/.+@.+\..+/.test(email)) return { ok: false, error: 'Informe nome e um e-mail válido.' };
    if (!password || password.length < 6) return { ok: false, error: 'A senha precisa de pelo menos 6 caracteres.' };

    if (FF.authMode() === 'supabase') {
      const sb = FF.supabase();
      if (!sb) return { ok: false, error: 'SDK do Supabase indisponível.' };
      try {
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nome } } });
        if (error) return { ok: false, error: friendlyAuthError(error.message) };
        // com "Confirm email" ativado no Supabase, signUp cria o usuário mas
        // NÃO devolve sessão — sem JWT, o RLS bloquearia todos os salvamentos.
        // Nesse caso não podemos fingir que o login aconteceu.
        if (!data.session) {
          return { ok: true, needsConfirmation: true };
        }
        FF.setSession({ userId: data.user.id, email, nome, provider: 'supabase' });
        upsertProfile(data.user.id, nome, email);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.' };
      }
    }

    const users = localUsers();
    if (users.some(u => u.email === email)) return { ok: false, error: 'Este e-mail já possui conta.' };
    const salt = FF.uid();
    users.push({
      id: FF.uid(), nome, email, salt,
      hash: await hash(salt + password),
      createdAt: Date.now(),
    });
    saveLocalUsers(users);
    const u = users[users.length - 1];
    FF.setSession({ userId: u.id, email, nome, provider: 'local' });
    return { ok: true };
  };

  // login → {ok} | {ok:false, error}
  FF.login = async ({ email, password }) => {
    email = normEmail(email);

    if (FF.authMode() === 'supabase') {
      const sb = FF.supabase();
      if (!sb) return { ok: false, error: 'SDK do Supabase indisponível.' };
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, error: friendlyAuthError(error.message) };
        const nome = data.user.user_metadata?.nome || email.split('@')[0];
        FF.setSession({ userId: data.user.id, email, nome, provider: 'supabase' });
        upsertProfile(data.user.id, nome, email);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.' };
      }
    }

    const u = localUsers().find(x => x.email === email);
    if (!u) return { ok: false, error: 'Conta não encontrada.' };
    if (await hash(u.salt + password) !== u.hash) return { ok: false, error: 'Senha incorreta.' };
    FF.setSession({ userId: u.id, email, nome: u.nome, provider: 'local' });
    return { ok: true };
  };

  // login com Google (somente Supabase)
  FF.loginWithGoogle = async () => {
    if (FF.authMode() !== 'supabase') {
      return { ok: false, error: 'Login com Google requer o Supabase configurado (Configurações → Sistema).' };
    }
    const sb = FF.supabase();
    if (!sb) return { ok: false, error: 'SDK do Supabase indisponível.' };
    try {
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname.replace(/pages\/[^/]*$|[^/]*$/, 'index.html') + '#conta' },
      });
      return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true, redirect: true };
    } catch (e) {
      return { ok: false, error: 'Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.' };
    }
  };

  FF.logout = async () => {
    if (FF.authMode() === 'supabase') {
      const sb = FF.supabase();
      if (sb) { try { await sb.auth.signOut(); } catch (e) { /* offline: encerra a sessão local mesmo assim */ } }
    }
    FF.setSession(null);
    location.href = root() + 'index.html#conta';
  };

  FF.updateProfile = ({ nome }) => {
    const s = FF.session();
    if (s) {
      s.nome = nome;
      FF.setSession(s);
      if (s.provider === 'supabase') upsertProfile(s.userId, nome, s.email);
    }
    FF.state.settings.nome = nome;
    FF.save();
  };

  // captura retorno do OAuth do Google (Supabase redireciona com token na URL)
  FF.resolveOAuth = async () => {
    if (FF.authMode() !== 'supabase') return false;
    await FF.loadSupabaseSDK();
    const sb = FF.supabase();
    if (!sb) return false;
    let data;
    try { ({ data } = await sb.auth.getSession()); } catch (e) { return false; }
    if (data && data.session) {
      const u = data.session.user;
      const nome = u.user_metadata?.nome || u.user_metadata?.full_name || u.email.split('@')[0];
      FF.setSession({ userId: u.id, email: u.email, nome, provider: 'supabase' });
      upsertProfile(u.id, nome, u.email);
      return true;
    }
    return false;
  };
})(window.FF);

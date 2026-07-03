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

  /* ---------- configuração do Supabase ---------- */
  FF.supabaseConfig = () => {
    try {
      const c = JSON.parse(localStorage.getItem(SB_CFG_KEY));
      return c && c.url && c.anonKey ? c : null;
    } catch (e) { return null; }
  };
  FF.setSupabaseConfig = (cfg) => {
    if (cfg) localStorage.setItem(SB_CFG_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(SB_CFG_KEY);
  };

  let sbClient = null;
  FF.supabase = () => {
    const cfg = FF.supabaseConfig();
    if (!cfg || typeof window.supabase === 'undefined') return null;
    if (!sbClient) sbClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    return sbClient;
  };

  // carrega o SDK local só quando há configuração (evita 250KB à toa)
  FF.loadSupabaseSDK = () => new Promise((resolve) => {
    if (!FF.supabaseConfig()) return resolve(false);
    if (typeof window.supabase !== 'undefined') return resolve(true);
    const s = document.createElement('script');
    s.src = 'assets/vendor/supabase.js';
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
  function saveLocalUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

  const normEmail = (e) => String(e || '').trim().toLowerCase();

  /* ---------- API pública ---------- */

  // cadastro → {ok, recoveryCode?} | {ok:false, error}
  FF.register = async ({ nome, email, password }) => {
    email = normEmail(email);
    if (!nome || !email || !/.+@.+\..+/.test(email)) return { ok: false, error: 'Informe nome e um e-mail válido.' };
    if (!password || password.length < 6) return { ok: false, error: 'A senha precisa de pelo menos 6 caracteres.' };

    if (FF.authMode() === 'supabase') {
      const sb = FF.supabase();
      if (!sb) return { ok: false, error: 'SDK do Supabase indisponível.' };
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { nome } } });
      if (error) return { ok: false, error: error.message };
      FF.setSession({ userId: data.user.id, email, nome, provider: 'supabase' });
      return { ok: true };
    }

    const users = localUsers();
    if (users.some(u => u.email === email)) return { ok: false, error: 'Este e-mail já possui conta.' };
    const salt = FF.uid();
    const recoveryCode = (FF.uid() + FF.uid()).slice(0, 12).toUpperCase();
    users.push({
      id: FF.uid(), nome, email, salt,
      hash: await hash(salt + password),
      recoveryHash: await hash(salt + recoveryCode),
      createdAt: Date.now(),
    });
    saveLocalUsers(users);
    const u = users[users.length - 1];
    FF.setSession({ userId: u.id, email, nome, provider: 'local' });
    return { ok: true, recoveryCode };
  };

  // login → {ok} | {ok:false, error}
  FF.login = async ({ email, password }) => {
    email = normEmail(email);

    if (FF.authMode() === 'supabase') {
      const sb = FF.supabase();
      if (!sb) return { ok: false, error: 'SDK do Supabase indisponível.' };
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      const nome = data.user.user_metadata?.nome || email.split('@')[0];
      FF.setSession({ userId: data.user.id, email, nome, provider: 'supabase' });
      return { ok: true };
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
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, 'login.html') },
    });
    return error ? { ok: false, error: error.message } : { ok: true, redirect: true };
  };

  // recuperação de senha
  FF.recoverPassword = async ({ email, recoveryCode, newPassword }) => {
    email = normEmail(email);

    if (FF.authMode() === 'supabase') {
      const sb = FF.supabase();
      if (!sb) return { ok: false, error: 'SDK do Supabase indisponível.' };
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname.replace(/[^/]*$/, 'login.html'),
      });
      return error ? { ok: false, error: error.message }
        : { ok: true, message: 'Enviamos um link de recuperação para o seu e-mail.' };
    }

    if (!newPassword || newPassword.length < 6) return { ok: false, error: 'A nova senha precisa de 6+ caracteres.' };
    const users = localUsers();
    const u = users.find(x => x.email === email);
    if (!u) return { ok: false, error: 'Conta não encontrada.' };
    if (await hash(u.salt + String(recoveryCode || '').trim().toUpperCase()) !== u.recoveryHash) {
      return { ok: false, error: 'Código de recuperação inválido.' };
    }
    u.hash = await hash(u.salt + newPassword);
    saveLocalUsers(users);
    return { ok: true, message: 'Senha redefinida! Faça login com a nova senha.' };
  };

  FF.logout = async () => {
    if (FF.authMode() === 'supabase') {
      const sb = FF.supabase();
      if (sb) await sb.auth.signOut();
    }
    FF.setSession(null);
    location.href = 'login.html';
  };

  FF.updateProfile = ({ nome }) => {
    const s = FF.session();
    if (s) { s.nome = nome; FF.setSession(s); }
    FF.state.settings.nome = nome;
    FF.save();
  };

  // captura retorno do OAuth do Google (Supabase redireciona com token na URL)
  FF.resolveOAuth = async () => {
    if (FF.authMode() !== 'supabase') return false;
    await FF.loadSupabaseSDK();
    const sb = FF.supabase();
    if (!sb) return false;
    const { data } = await sb.auth.getSession();
    if (data && data.session) {
      const u = data.session.user;
      FF.setSession({
        userId: u.id, email: u.email,
        nome: u.user_metadata?.nome || u.user_metadata?.full_name || u.email.split('@')[0],
        provider: 'supabase',
      });
      return true;
    }
    return false;
  };
})(window.FF);

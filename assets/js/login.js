/* ============================================================
   FinanceFlow — Login / Cadastro / Recuperação
   ============================================================ */

(() => {
  FF.applyTheme();

  const tabs = document.querySelectorAll('.auth-tabs button');
  const forms = { login: formLogin, register: formRegister, recover: formRecover };

  tabs.forEach(t => t.onclick = () => {
    tabs.forEach(x => x.classList.toggle('active', x === t));
    for (const [k, f] of Object.entries(forms)) f.style.display = k === t.dataset.tab ? '' : 'none';
  });

  // dica do modo ativo
  const hint = document.getElementById('authModeHint');
  const isCloud = FF.authMode() === 'supabase';
  hint.innerHTML = isCloud
    ? '☁️ Modo nuvem ativo — conta gerenciada pelo Supabase, com sincronização entre dispositivos.'
    : '💾 Modo local — sua conta fica apenas neste navegador. Configure o Supabase em Configurações para sincronizar.';
  if (!isCloud) document.getElementById('btnGoogle').style.opacity = '.55';
  else document.getElementById('recLocalFields').style.display = 'none';

  // retorno de OAuth (Google) quando em modo nuvem
  if (isCloud) {
    FF.resolveOAuth().then(ok => { if (ok) location.href = 'dashboard.html'; });
  }

  const busy = (form, on) => form.querySelectorAll('button, input').forEach(el => el.disabled = on);

  /* ---------- login ---------- */
  formLogin.onsubmit = async (e) => {
    e.preventDefault();
    busy(formLogin, true);
    if (isCloud) await FF.loadSupabaseSDK();
    const r = await FF.login({
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPass').value,
    });
    busy(formLogin, false);
    if (!r.ok) return FF.toast(r.error, 'error', '⚠️');
    FF.toast('Bem-vindo de volta! 👋', 'success', '✅');
    setTimeout(() => location.href = 'dashboard.html', 700);
  };

  /* ---------- google ---------- */
  document.getElementById('btnGoogle').onclick = async () => {
    if (isCloud) await FF.loadSupabaseSDK();
    const r = await FF.loginWithGoogle();
    if (!r.ok) FF.toast(r.error, 'error', '⚠️');
    // com ok+redirect o navegador é levado ao Google pelo SDK
  };

  /* ---------- cadastro ---------- */
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
    if (!r.ok) return FF.toast(r.error, 'error', '⚠️');
    if (r.recoveryCode) {
      document.getElementById('recoveryBox').innerHTML = `
        <div class="recovery-box">
          ⚠️ <b>Guarde seu código de recuperação</b> — ele é a única forma de redefinir a senha
          de uma conta local:
          <code>${r.recoveryCode}</code>
          <button class="btn btn-primary btn-sm mt-8" type="button" onclick="location.href='dashboard.html'">
            Já guardei, ir para o Dashboard →</button>
        </div>`;
      FF.toast('Conta criada! Guarde o código de recuperação.', 'success', '🎉');
    } else {
      FF.toast('Conta criada! Verifique seu e-mail para confirmar.', 'success', '🎉');
      setTimeout(() => location.href = 'dashboard.html', 1200);
    }
  };

  /* ---------- recuperação ---------- */
  formRecover.onsubmit = async (e) => {
    e.preventDefault();
    busy(formRecover, true);
    if (isCloud) await FF.loadSupabaseSDK();
    const r = await FF.recoverPassword({
      email: document.getElementById('recEmail').value,
      recoveryCode: document.getElementById('recCode') ? document.getElementById('recCode').value : '',
      newPassword: document.getElementById('recPass') ? document.getElementById('recPass').value : '',
    });
    busy(formRecover, false);
    if (!r.ok) return FF.toast(r.error, 'error', '⚠️');
    FF.toast(r.message || 'Pronto!', 'success', '✅');
    if (!isCloud) tabs[0].click();
  };
})();

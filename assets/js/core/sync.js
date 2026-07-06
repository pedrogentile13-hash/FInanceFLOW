/* ============================================================
   FinanceFlow · core/sync.js
   Sincronização em nuvem via Supabase (Fase 6).
   · push com debounce a cada FF.save()
   · pull no carregamento (last-write-wins por lastModified)
   · realtime: mudanças de outro dispositivo aplicadas ao vivo
   Sem Supabase configurado ou sem login, nada é executado —
   o app permanece 100% local.
   ============================================================ */

(function (FF) {
  'use strict';

  const TABLE = 'financeflow_data';
  let pushTimer = null;
  let applyingRemote = false;

  function canSync() {
    const s = FF.session();
    return !!(FF.supabaseConfig() && s && s.provider === 'supabase' && FF.supabase());
  }

  async function push() {
    if (!canSync() || applyingRemote) return;
    const sb = FF.supabase();
    const s = FF.session();
    const { error } = await sb.from(TABLE).upsert({
      user_id: s.userId,
      data: FF.state,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn('FF sync push', error.message);
  }

  function schedulePush() {
    if (!canSync()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 2000);
  }

  async function pull() {
    if (!canSync()) return;
    const sb = FF.supabase();
    const s = FF.session();
    const { data, error } = await sb.from(TABLE).select('data').eq('user_id', s.userId).maybeSingle();
    if (error) { console.warn('FF sync pull', error.message); return; }
    if (data && data.data && (data.data.lastModified || 0) > (FF.state.lastModified || 0)) {
      applyRemote(data.data);
    } else if (!data) {
      push(); // primeiro dispositivo: sobe o estado atual
    }
  }

  function applyRemote(remoteState) {
    applyingRemote = true;
    FF.replaceState(remoteState);
    applyingRemote = false;
    FF.toast('Dados sincronizados de outro dispositivo. Atualizando…', 'success');
    setTimeout(() => location.reload(), 1200);
  }

  function subscribe() {
    if (!canSync()) return;
    const sb = FF.supabase();
    const s = FF.session();
    sb.channel('ff-sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${s.userId}` },
        (payload) => {
          const remote = payload.new && payload.new.data;
          if (remote && (remote.lastModified || 0) > (FF.state.lastModified || 0)) applyRemote(remote);
        })
      .subscribe();
  }

  FF.initSync = async () => {
    // só carrega o SDK (~200KB) quando existe de fato uma sessão
    // Supabase ativa — visitantes e contas locais nunca pagam esse custo,
    // mesmo com o projeto padrão configurado para todo mundo.
    const s = FF.session();
    if (!FF.supabaseConfig() || !s || s.provider !== 'supabase') return;
    await FF.loadSupabaseSDK();
    if (!canSync()) return;
    FF.onSave(schedulePush);
    await pull();
    subscribe();
  };

  FF.syncStatus = () => {
    if (!FF.supabaseConfig()) return 'off';
    const s = FF.session();
    if (!s || s.provider !== 'supabase') return 'logged-out';
    return 'on';
  };
})(window.FF);

# FinanceFlow — Plano de Implementação v1.0

## Análise da arquitetura atual (v0.9)

- **12 páginas HTML** estáticas que compartilham o mesmo shell (sidebar injetada + topbar).
- **`assets/js/app.js`** é um monólito com 6 responsabilidades: storage/estado, formatação,
  cálculos financeiros, gamificação, componentes de UI (toast/modal/sidebar/topbar) e seed de dados.
- **Página = 1 script** (`dashboard.js`, `metas.js`, …) que consome a API global `FF.*`.
- **Persistência**: LocalStorage, chave única `financeflow_v1`.
- **Categorias**: hardcoded em `transacoes.js`.
- **Cores**: azul fixo (`#000A64`/`#2E3BC9`) espalhado em CSS e nos gráficos.
- Dependências 100% locais (Chart.js e Inter embutidos) — deve permanecer assim.

**Invariante do plano:** a API global `FF.*` consumida pelas páginas não muda de assinatura.
Toda melhoria acontece por baixo dela — nenhuma página perde funcionalidade.

## Fase 1+2 — Interface, microinterações e UX
- Tokens de gradiente (`--grad-a/--grad-b`) substituem cores fixas → habilita cor principal customizável.
- Sombras em camadas, animações de entrada (stagger nos KPIs), estados `:focus-visible`,
  `prefers-reduced-motion`, números tabulares nos KPIs, topbar refinada, melhorias mobile
  (safe-area, alvos de toque maiores).

## Fase 4 (antecipada por dependência técnica) — Refatoração em módulos
> As Fases 3, 5 e 6 dependem da modularização; o comportamento não muda.

```
assets/js/core/
  utils.js         formatação (moeda/data/locale), esc, uid — lê settings em runtime
  store.js         estado, load/save por perfil, categorias dinâmicas, seed, backup, reset
  gamification.js  XP, níveis, conquistas, streak
  ui.js            tema, cor principal, sidebar, topbar, toast, modal, chart defaults
  auth.js          contas locais + provedor Supabase (Fase 5)
  sync.js          sincronização em nuvem via Supabase (Fase 6)
assets/js/app.js   compositor fino: monta o namespace FF e chama init
```

## Fase 3 — Página de Configurações (`configuracoes.html`)
- **Personalização**: tema (claro/escuro), cor principal (6 presets aplicados via CSS vars),
  idioma/formato (pt-BR, en-US → afeta Intl), moeda (BRL/USD/EUR), formato de data (DD/MM, MM/DD, ISO).
- **Financeiro**: CRUD de categorias de entrada e saída com ícone e cor (usadas nos formulários
  e gráficos; migração automática das categorias padrão).
- **Sistema**: exportar/importar backup JSON, resetar sistema, configuração do Supabase.
- **Perfil**: nome, e-mail e sessão (integra com a Fase 5).

## Fase 5 — Autenticação (`login.html` + `core/auth.js`)
- **Modo local (padrão, offline)**: cadastro/login com hash de senha (SubtleCrypto + salt),
  código de recuperação gerado no cadastro, sessão persistente, dados isolados por usuário
  (`financeflow_v1:<userId>`); dados de visitante continuam funcionando como hoje.
- **Modo Supabase (quando configurado)**: e-mail/senha, login com Google (OAuth),
  recuperação de senha por e-mail, sessão gerenciada pelo SDK.

## Fase 6 — Banco de dados em nuvem
**Decisão: Supabase** (vs Firebase):
1. **Modelo relacional (Postgres)** — dados financeiros são naturalmente relacionais;
   Firestore (NoSQL) complicaria consultas agregadas futuras.
2. **Row Level Security nativa** — isolamento por usuário declarado no banco, não no cliente.
3. **Auth integrada com Google OAuth e recuperação por e-mail** — cobre a Fase 5 sem serviço extra.
4. **SDK JS utilizável via bundle UMD local** — compatível com a stack sem build e com a
   política de rede (vendorizado em `assets/vendor/`).
5. **Open source e sem lock-in** — exportável/auto-hospedável; Firebase é proprietário.
6. **Realtime nativo do Postgres** — sincronização automática entre dispositivos.

- Tabela `financeflow_data (user_id uuid PK, data jsonb, updated_at)` com RLS (`supabase/schema.sql`).
- `core/sync.js`: push com debounce a cada `FF.save()`, pull no login, last-write-wins,
  assinatura realtime para sincronizar dispositivos abertos.
- Sem credenciais configuradas o app permanece 100% local (nenhuma regressão).

## Ordem de execução
1. Refatoração core (invisível) → 2. CSS/UX → 3. Configurações → 4. Autenticação → 5. Sync → 6. Testes de todas as páginas no Chromium + commit.

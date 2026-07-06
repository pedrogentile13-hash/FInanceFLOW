-- ============================================================
-- FinanceFlow — Schema do Supabase (v2: tabelas relacionais)
-- Execute no SQL Editor do seu projeto Supabase.
--
-- Cada tipo de dado tem sua própria tabela (transações, metas,
-- sonhos, investimentos, projetos, lançamentos de projeto e
-- categorias). XP/conquistas/preferências ficam em uma linha por
-- usuário em user_settings. Todas protegidas por Row Level
-- Security: cada usuário só enxerga e altera as próprias linhas.
--
-- Se você rodou a versão anterior deste schema (tabela única
-- financeflow_data), pode apagá-la com segurança depois de migrar:
--   drop table if exists public.financeflow_data;
-- ============================================================

create table if not exists public.categories (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('in', 'out')),
  nome       text not null,
  icone      text,
  cor        text,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('in', 'out')),
  date       date not null,
  descricao  text,
  category   text,
  value      numeric not null,
  method     text,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  nome       text not null,
  objetivo   numeric not null,
  atual      numeric not null default 0,
  prazo      date,
  categoria  text,
  prioridade text,
  created_at timestamptz not null default now()
);

create table if not exists public.dreams (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  nome       text not null,
  emoji      text,
  valor      numeric not null,
  acumulado  numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  tipo       text,
  value      numeric not null,
  data       date,
  rendimento numeric,
  obs        text,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  nome       text not null,
  status     text,
  obs        text,
  clientes   integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_entries (
  id         text primary key,
  project_id text not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  tipo       text not null check (tipo in ('receita', 'custo')),
  valor      numeric not null,
  descricao  text,
  data       date,
  created_at timestamptz not null default now()
);

-- XP, conquistas e preferências: uma linha por usuário.
create table if not exists public.user_settings (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  xp           integer not null default 0,
  achievements jsonb not null default '[]',
  settings     jsonb not null default '{}',
  seeded       boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- ---------- Row Level Security ----------
-- Mesma política (dono da linha) repetida para cada tabela.
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'transactions', 'goals', 'dreams',
                            'investments', 'projects', 'project_entries', 'user_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows - select" on public.%I', t);
    execute format('drop policy if exists "own rows - insert" on public.%I', t);
    execute format('drop policy if exists "own rows - update" on public.%I', t);
    execute format('drop policy if exists "own rows - delete" on public.%I', t);
    execute format('create policy "own rows - select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own rows - insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own rows - update" on public.%I for update using (auth.uid() = user_id)', t);
    execute format('create policy "own rows - delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- índices para as consultas mais comuns (tudo filtrado por usuário)
create index if not exists idx_transactions_user on public.transactions (user_id);
create index if not exists idx_goals_user on public.goals (user_id);
create index if not exists idx_dreams_user on public.dreams (user_id);
create index if not exists idx_investments_user on public.investments (user_id);
create index if not exists idx_projects_user on public.projects (user_id);
create index if not exists idx_project_entries_user on public.project_entries (user_id);
create index if not exists idx_project_entries_project on public.project_entries (project_id);
create index if not exists idx_categories_user on public.categories (user_id);

-- Realtime: permite que outros dispositivos recebam mudanças ao vivo.
alter publication supabase_realtime add table
  public.categories, public.transactions, public.goals, public.dreams,
  public.investments, public.projects, public.project_entries, public.user_settings;

-- ============================================================
-- Depois de rodar este script:
-- 1. Authentication → Providers → habilite Email e Google.
-- 2. Copie Project URL e anon key (Settings → API).
-- 3. Cole em FinanceFlow → Configurações → Nuvem (ou use o padrão
--    já embutido no app, se for o caso).
-- ============================================================

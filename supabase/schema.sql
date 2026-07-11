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

-- Perfis públicos: espelho visível de auth.users (onde o Supabase Auth
-- guarda os logins de verdade). Uma linha por usuário, criada
-- automaticamente pelo trigger abaixo a cada cadastro.
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nome       text,
  email      text,
  created_at timestamptz not null default now()
);

-- cria o perfil automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, nome, email)
  values (new.id, new.raw_user_meta_data->>'nome', new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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


-- ---------- Reconciliação de formato ----------
-- Se alguma tabela foi criada manualmente ou por uma versão antiga do
-- script, pode estar sem colunas que o app envia — o PostgREST então
-- rejeita o INSERT inteiro ("Could not find the '...' column") e o dado
-- nunca chega ao banco. Estes ALTERs garantem o formato esperado sem
-- apagar nada. (create table if not exists NÃO corrige tabela existente!)
alter table public.transactions    add column if not exists type text;
alter table public.transactions    add column if not exists date date;
alter table public.transactions    add column if not exists descricao text;
alter table public.transactions    add column if not exists category text;
alter table public.transactions    add column if not exists value numeric;
alter table public.transactions    add column if not exists method text;
alter table public.transactions    add column if not exists created_at timestamptz default now();
alter table public.goals           add column if not exists nome text;
alter table public.goals           add column if not exists objetivo numeric;
alter table public.goals           add column if not exists atual numeric default 0;
alter table public.goals           add column if not exists prazo date;
alter table public.goals           add column if not exists categoria text;
alter table public.goals           add column if not exists prioridade text;
alter table public.dreams          add column if not exists nome text;
alter table public.dreams          add column if not exists emoji text;
alter table public.dreams          add column if not exists valor numeric;
alter table public.dreams          add column if not exists acumulado numeric default 0;
alter table public.investments     add column if not exists tipo text;
alter table public.investments     add column if not exists value numeric;
alter table public.investments     add column if not exists data date;
alter table public.investments     add column if not exists rendimento numeric;
alter table public.investments     add column if not exists obs text;
alter table public.projects        add column if not exists nome text;
alter table public.projects        add column if not exists status text;
alter table public.projects        add column if not exists obs text;
alter table public.projects        add column if not exists clientes integer default 0;
alter table public.project_entries add column if not exists project_id text;
alter table public.project_entries add column if not exists tipo text;
alter table public.project_entries add column if not exists valor numeric;
alter table public.project_entries add column if not exists descricao text;
alter table public.project_entries add column if not exists data date;
alter table public.categories      add column if not exists type text;
alter table public.categories      add column if not exists nome text;
alter table public.categories      add column if not exists icone text;
alter table public.categories      add column if not exists cor text;
alter table public.user_settings   add column if not exists xp integer default 0;
alter table public.user_settings   add column if not exists achievements jsonb default '[]';
alter table public.user_settings   add column if not exists settings jsonb default '{}';
alter table public.user_settings   add column if not exists seeded boolean default false;
alter table public.user_settings   add column if not exists updated_at timestamptz default now();
alter table public.profiles        add column if not exists nome text;
alter table public.profiles        add column if not exists email text;

-- colunas obrigatórias que o app pode não preencher em tabelas antigas:
-- relaxa NOT NULL herdado de criações manuais divergentes
do $$
begin
  begin alter table public.transactions alter column descricao drop not null; exception when others then null; end;
  begin alter table public.transactions alter column category drop not null; exception when others then null; end;
  begin alter table public.transactions alter column method drop not null; exception when others then null; end;
end $$;

-- ---------- Row Level Security ----------
-- Mesma política (dono da linha) repetida para cada tabela.
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'categories', 'transactions', 'goals', 'dreams',
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
-- (idempotente: rodar este script mais de uma vez não dá erro — no SQL
-- Editor do Supabase um erro aqui no fim desfaria o script INTEIRO,
-- inclusive a criação das tabelas lá de cima)
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'transactions', 'goals', 'dreams',
                            'investments', 'projects', 'project_entries', 'user_settings']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- já estava na publication
    end;
  end loop;
end $$;

-- ============================================================
-- Depois de rodar este script:
-- 1. Authentication → Providers → habilite Email e Google.
-- 2. Copie Project URL e anon key (Settings → API) e coloque em
--    DEFAULT_SUPABASE dentro de assets/js/core/auth.js (ou use o
--    padrão já embutido no app, se for o caso).
-- ============================================================

-- ============================================================
-- FinanceFlow — Schema do Supabase (Fase 6)
-- Execute no SQL Editor do seu projeto Supabase.
-- ============================================================

-- Tabela única de sincronização: um documento JSON por usuário.
create table if not exists public.financeflow_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: cada usuário só enxerga a própria linha.
alter table public.financeflow_data enable row level security;

create policy "own data - select" on public.financeflow_data
  for select using (auth.uid() = user_id);

create policy "own data - insert" on public.financeflow_data
  for insert with check (auth.uid() = user_id);

create policy "own data - update" on public.financeflow_data
  for update using (auth.uid() = user_id);

create policy "own data - delete" on public.financeflow_data
  for delete using (auth.uid() = user_id);

-- Realtime: permite que outros dispositivos recebam mudanças ao vivo.
alter publication supabase_realtime add table public.financeflow_data;

-- ============================================================
-- Depois de rodar este script:
-- 1. Authentication → Providers → habilite Email e Google.
-- 2. Copie Project URL e anon key (Settings → API).
-- 3. Cole em FinanceFlow → Configurações → Sincronização em nuvem.
-- ============================================================

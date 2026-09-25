-- Supabase: banco + Realtime para Timbó em Missão
create extension if not exists pgcrypto;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  meta_kg numeric(12,3) not null check (meta_kg > 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  unit text not null,
  weight_per_unit_grams numeric(12,3) not null check (weight_per_unit_grams > 0),
  target_quantity numeric(12,3) not null check (target_quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  quantity numeric(12,3) not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists foods_campaign_id_idx on public.foods(campaign_id);
create index if not exists donations_food_id_idx on public.donations(food_id);
create index if not exists donations_created_at_idx on public.donations(created_at desc);

alter table public.campaigns enable row level security;
alter table public.foods enable row level security;
alter table public.donations enable row level security;

-- Esta primeira versão mantém o painel sem login para facilitar o uso na ação.
-- Portanto, quem tiver acesso ao app também consegue escrever. Para produção,
-- adicione Supabase Auth e restrinja INSERT/UPDATE/DELETE ao usuário autenticado.

drop policy if exists "anon read campaigns" on public.campaigns;
drop policy if exists "anon write campaigns" on public.campaigns;
create policy "anon read campaigns" on public.campaigns for select to anon, authenticated using (true);
create policy "anon write campaigns" on public.campaigns for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon read foods" on public.foods;
drop policy if exists "anon write foods" on public.foods;
create policy "anon read foods" on public.foods for select to anon, authenticated using (true);
create policy "anon write foods" on public.foods for all to anon, authenticated using (true) with check (true);

drop policy if exists "anon read donations" on public.donations;
drop policy if exists "anon write donations" on public.donations;
create policy "anon read donations" on public.donations for select to anon, authenticated using (true);
create policy "anon write donations" on public.donations for all to anon, authenticated using (true) with check (true);

-- Habilita mudanças em tempo real para os três conjuntos de dados.
do $$ begin
  alter publication supabase_realtime add table public.campaigns;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.foods;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.donations;
exception when duplicate_object then null;
end $$;

-- Campanha inicial
insert into public.campaigns (id, name, meta_kg, description)
values (
  '00000000-0000-0000-0000-000000000001',
  'Timbó em Missão — Ação Social 2026',
  3000,
  'Uma ação social da igreja para levar cuidado, alimento e esperança a quem precisa.'
)
on conflict (id) do nothing;

-- Alimentos iniciais. Se já houver alimentos para a campanha, não duplica.
insert into public.foods (campaign_id, name, unit, weight_per_unit_grams, target_quantity)
select '00000000-0000-0000-0000-000000000001', v.name, v.unit, v.weight, v.target
from (values
  ('Café', 'pacotes', 200::numeric, 150::numeric),
  ('Arroz', 'pacotes', 1000::numeric, 500::numeric),
  ('Feijão', 'pacotes', 1000::numeric, 300::numeric),
  ('Macarrão', 'pacotes', 500::numeric, 200::numeric)
) v(name, unit, weight, target)
where not exists (
  select 1 from public.foods f
  where f.campaign_id = '00000000-0000-0000-0000-000000000001'
);

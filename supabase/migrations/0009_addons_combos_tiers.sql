-- Preço progressivo por produto: [{ "min_qty": 5, "unit_price": 62.00 }, ...]
alter table public.products
  add column price_tiers jsonb not null default '[]'::jsonb;

-- Adicionais do pedido (nome + valor), escolhidos pelo cliente no checkout.
create table public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger addons_set_updated_at before update on public.addons
  for each row execute function public.set_updated_at();

alter table public.addons enable row level security;

create policy "addons_select_public" on public.addons
  for select using (true);
create policy "addons_write_admin" on public.addons
  for all using (public.is_admin()) with check (public.is_admin());

-- Kits/combos prontos (preço fechado) montados pelo admin.
create table public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  image_url text,
  price numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger combos_set_updated_at before update on public.combos
  for each row execute function public.set_updated_at();

create table public.combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.combos(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0)
);

create index combo_items_combo_id_idx on public.combo_items(combo_id);

alter table public.combos enable row level security;
alter table public.combo_items enable row level security;

create policy "combos_select_public" on public.combos
  for select using (true);
create policy "combos_write_admin" on public.combos
  for all using (public.is_admin()) with check (public.is_admin());

create policy "combo_items_select_public" on public.combo_items
  for select using (true);
create policy "combo_items_write_admin" on public.combo_items
  for all using (public.is_admin()) with check (public.is_admin());

-- Linha de kit no pedido (adicionais são linhas sem product_id e sem combo_id).
alter table public.order_items
  add column combo_id uuid references public.combos(id) on delete set null;

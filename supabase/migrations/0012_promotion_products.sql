-- Produtos de cada promoção, cada um com o seu preço promocional.
create table public.promotion_products (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  promo_price numeric(10, 2) not null check (promo_price > 0),
  unique (promotion_id, product_id)
);

create index promotion_products_promotion_id_idx
  on public.promotion_products(promotion_id);

alter table public.promotion_products enable row level security;

create policy "promotion_products_select_public" on public.promotion_products
  for select using (true);
create policy "promotion_products_write_admin" on public.promotion_products
  for all using (public.is_admin()) with check (public.is_admin());

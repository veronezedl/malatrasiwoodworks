-- Frete por peso e estado: valor (R$) por kg em cada UF atendida.
create table public.shipping_rates (
  uf text primary key check (char_length(uf) = 2),
  price_per_kg numeric(10, 2) not null check (price_per_kg > 0),
  updated_at timestamptz not null default now()
);

create trigger shipping_rates_set_updated_at before update on public.shipping_rates
  for each row execute function public.set_updated_at();

alter table public.shipping_rates enable row level security;

create policy "shipping_rates_select_public" on public.shipping_rates
  for select using (true);
create policy "shipping_rates_write_admin" on public.shipping_rates
  for all using (public.is_admin()) with check (public.is_admin());

-- Métodos de entrega passam a ter um tipo de preço: valor fixo (como antes)
-- ou calculado pelo peso do carrinho x valor por kg do estado do CEP.
alter table public.shipping_methods
  add column pricing_type text not null default 'fixed'
  check (pricing_type in ('fixed', 'weight'));

insert into public.shipping_methods (name, min_days, max_days, price, pricing_type)
values ('Frete por peso e estado', 5, 10, 0, 'weight');

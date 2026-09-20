-- Categorias de produto cadastradas pelo admin, no lugar da lista fixa
-- (CATEGORIES em src/lib/product-constants.ts). Mesmo padrão de
-- handle_models: leitura pública, escrita só admin.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

create policy "categories_select_public" on public.categories
  for select using (true);
create policy "categories_write_admin" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- Migra os valores de texto livre já usados em products.category para a
-- nova tabela, depois troca a coluna por uma referência (category_id).
insert into public.categories (name)
select distinct category from public.products
on conflict (name) do nothing;

alter table public.products add column category_id uuid references public.categories (id);
update public.products p set category_id = c.id from public.categories c where c.name = p.category;
alter table public.products alter column category_id set not null;
alter table public.products drop column category;

create index products_category_id_idx on public.products (category_id);

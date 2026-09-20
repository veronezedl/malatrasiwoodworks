-- Imagens do banner da home (lateral direita do hero), gerenciadas pelo admin.
-- O upload reutiliza o bucket "products" (leitura pública, escrita só admin).
create table public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger hero_banners_set_updated_at before update on public.hero_banners
  for each row execute function public.set_updated_at();

alter table public.hero_banners enable row level security;

create policy "hero_banners_select_public" on public.hero_banners
  for select using (true);
create policy "hero_banners_write_admin" on public.hero_banners
  for all using (public.is_admin()) with check (public.is_admin());

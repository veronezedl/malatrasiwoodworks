-- Configurações do banner da home: tempo de troca das imagens (segundos) e
-- opacidade das imagens (%). Uma única linha (id = 1).
create table public.hero_settings (
  id integer primary key default 1 check (id = 1),
  interval_seconds integer not null default 5 check (interval_seconds between 2 and 60),
  opacity integer not null default 100 check (opacity between 10 and 100),
  updated_at timestamptz not null default now()
);

insert into public.hero_settings (id) values (1);

create trigger hero_settings_set_updated_at before update on public.hero_settings
  for each row execute function public.set_updated_at();

alter table public.hero_settings enable row level security;

create policy "hero_settings_select_public" on public.hero_settings
  for select using (true);
create policy "hero_settings_write_admin" on public.hero_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Galeria de fotos de clientes satisfeitos, cadastrada pelo admin e exibida
-- publicamente no site (prova social). Mesmo padrão de categories/
-- handle_models: leitura pública, escrita só admin.

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gallery_photos_set_updated_at before update on public.gallery_photos
  for each row execute function public.set_updated_at();

alter table public.gallery_photos enable row level security;

create policy "gallery_photos_select_public" on public.gallery_photos
  for select using (true);
create policy "gallery_photos_write_admin" on public.gallery_photos
  for all using (public.is_admin()) with check (public.is_admin());

-- Bucket de imagens: mesmo padrão do bucket "products" (leitura pública,
-- escrita só admin) — não o padrão de quotes/engravings (que permite envio
-- anônimo), porque aqui só o admin sobe foto, nunca o cliente.
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "gallery_bucket_select_public" on storage.objects
  for select using (bucket_id = 'gallery');
create policy "gallery_bucket_insert_admin" on storage.objects
  for insert with check (bucket_id = 'gallery' and public.is_admin());
create policy "gallery_bucket_update_admin" on storage.objects
  for update using (bucket_id = 'gallery' and public.is_admin());
create policy "gallery_bucket_delete_admin" on storage.objects
  for delete using (bucket_id = 'gallery' and public.is_admin());

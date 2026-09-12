-- ─────────────────────────────────────────────────────────────────────────
-- Malatrasi WoodWorks — esquema inicial
-- (clientes, catálogo, pedidos com acompanhamento completo, orçamentos sob
-- encomenda, avaliações, suporte, promoções, painel admin)
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── Papéis de perfil (cliente / admin) ────────────────────────────────────
create type public.user_role as enum ('customer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- ─── Clientes ───────────────────────────────────────────────────────────
-- Dados básicos para um pedido de venda no Brasil. Os campos de contato/
-- endereço aceitam nulo porque o checkout de convidado salva um "pré-
-- cadastro" incompleto (autosave) antes de o cliente terminar de preencher
-- — um pedido real só é criado depois que a Edge Function valida que o
-- essencial está preenchido.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  full_name text,
  email text,
  phone text, -- formato E.164, ex: +5511999998888
  cpf_cnpj text, -- CPF ou CNPJ, opcional (útil para nota fiscal)
  address_line1 text,
  address_line2 text,
  postal_code text, -- CEP
  city text,
  region text, -- UF
  country_code text not null default 'BR',
  avatar_url text,
  marketing_opt_in boolean not null default false,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_email_idx on public.customers (email);
create index customers_auth_user_id_idx on public.customers (auth_user_id);

-- ─── Produtos ──────────────────────────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  image_url text not null,
  description text not null default '',
  wood_type text, -- tipo de madeira predominante (ex: "Freijó", "Pinus"), opcional
  is_custom_order boolean not null default false, -- peça sob encomenda (exige orçamento)
  active boolean not null default true,
  featured boolean not null default false,
  visible_in_store boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Métodos de entrega ─────────────────────────────────────────────────
create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_days integer not null check (min_days >= 0),
  max_days integer not null check (max_days >= min_days),
  price numeric(10, 2) not null default 0,
  active boolean not null default true,
  visible_in_store boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Pedidos ────────────────────────────────────────────────────────────
create type public.order_status as enum (
  'pending',    -- pedido criado, aguardando confirmação
  'confirmed',  -- confirmado pela equipe
  'processing', -- em produção/preparação
  'shipped',    -- enviado ao cliente
  'delivered',  -- entregue
  'cancelled',  -- cancelado
  'refunded'    -- reembolsado
);

-- Sem gateway de pagamento por enquanto — apenas registra a forma combinada
-- com o cliente. O admin controla manualmente payment_status.
create type public.payment_method as enum ('pix', 'transferencia', 'dinheiro', 'a_combinar');
create type public.payment_status as enum ('pending', 'paid');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique, -- ex: MWW-00001, gerado por trigger
  customer_id uuid not null references public.customers (id) on delete restrict,
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null default 'a_combinar',
  payment_status public.payment_status not null default 'pending',
  subtotal numeric(10, 2) not null default 0,
  shipping_method_id uuid references public.shipping_methods (id) on delete set null,
  shipping_method_name text,
  shipping_cost numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  -- snapshot do endereço de entrega no momento do pedido
  shipping_full_name text not null,
  shipping_phone text not null,
  shipping_address_line1 text not null,
  shipping_address_line2 text,
  shipping_postal_code text not null,
  shipping_city text not null,
  shipping_region text,
  shipping_country_code text not null default 'BR',
  admin_notes text,
  -- personalização gravada na peça (texto e/ou imagem de referência),
  -- coletada no checkout e aplicada ao pedido inteiro
  engraving_text text,
  engraving_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null, -- snapshot
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

-- Histórico de mudanças de status — alimenta o acompanhamento do pedido
-- (OrderTracker) e dispara as notificações por email.
create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references auth.users (id),
  notified_email boolean not null default false,
  created_at timestamptz not null default now()
);

create index order_status_events_order_id_idx on public.order_status_events (order_id);

-- ─── Orçamentos sob encomenda ───────────────────────────────────────────
-- Peças personalizadas (móveis sob medida) que exigem orçamento antes de
-- virarem pedido. Mesmo padrão de support_requests.
create type public.quote_status as enum (
  'novo',
  'em_analise',
  'orcamento_enviado',
  'aprovado',
  'recusado',
  'convertido'
);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  description text not null, -- peça desejada
  wood_type text,
  dimensions text,
  reference_image_url text,
  budget_hint numeric(10, 2),
  -- calculadora sob medida: dimensões estruturadas + estimativa automática,
  -- preenchidas pela calculadora em /orcamento (ver src/lib/pricing.ts).
  -- Tudo opcional — o cliente ainda pode preencher só a descrição livre.
  product_type text,
  width_cm numeric(8, 2),
  length_cm numeric(8, 2),
  height_cm numeric(8, 2),
  has_handle boolean not null default false,
  estimated_price numeric(10, 2),
  status public.quote_status not null default 'novo',
  quoted_price numeric(10, 2),
  admin_notes text,
  converted_order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quote_requests_customer_id_idx on public.quote_requests (customer_id);

-- ─── Numeração automática de pedidos (MWW-00001, MWW-00002, ...) ──────────
create sequence public.order_number_seq start 1;

create or replace function public.set_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number := 'MWW-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger orders_set_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- Registra automaticamente o primeiro evento de status ao criar um pedido
-- (e cada mudança posterior). security definer: um cliente comum não tem
-- policy de insert em order_status_events, mas o trigger precisa gravar.
create or replace function public.log_order_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    insert into public.order_status_events (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_log_status_insert
  after insert on public.orders
  for each row execute function public.log_order_status_event();

create trigger orders_log_status_update
  after update of status on public.orders
  for each row execute function public.log_order_status_event();

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger shipping_methods_set_updated_at before update on public.shipping_methods
  for each row execute function public.set_updated_at();
create trigger quote_requests_set_updated_at before update on public.quote_requests
  for each row execute function public.set_updated_at();

-- ─── Suporte ao cliente ─────────────────────────────────────────────────
create type public.support_request_status as enum ('open', 'in_progress', 'resolved');

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  subject text not null,
  message text not null,
  status public.support_request_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_requests_customer_id_idx on public.support_requests (customer_id);

create trigger support_requests_set_updated_at before update on public.support_requests
  for each row execute function public.set_updated_at();

-- ─── Avaliações de produtos ─────────────────────────────────────────────
-- Uma avaliação por cliente e produto, só possível se o produto foi
-- entregue em algum dos seus pedidos (verificado a nível de aplicação).
-- Guarda um "nome de exibição" (ex: "Dhionatan V.") em vez de expor a
-- tabela customers inteira via policy pública cruzada.
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  customer_name text not null default '',
  customer_city text,
  customer_country text,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index product_reviews_customer_id_idx on public.product_reviews (customer_id);
create index product_reviews_product_id_idx on public.product_reviews (product_id);

-- ─── Promoções (faixa de contagem regressiva no topo do site) ──────────
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  message text not null default 'Promoção termina em',
  ends_at timestamptz not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger promotions_set_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

-- No máximo uma promoção ativa por vez, garantido pelo próprio índice.
create unique index promotions_single_active on public.promotions ((true)) where active;

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_events enable row level security;
alter table public.quote_requests enable row level security;
alter table public.support_requests enable row level security;
alter table public.product_reviews enable row level security;
alter table public.promotions enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: cada usuário vê/edita só seu próprio perfil; admins veem todos.
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- products: leitura pública (catálogo da loja); escrita só admin.
create policy "products_select_public" on public.products
  for select using (true);
create policy "products_write_admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- shipping_methods: leitura pública; escrita só admin.
create policy "shipping_methods_select_public" on public.shipping_methods
  for select using (true);
create policy "shipping_methods_write_admin" on public.shipping_methods
  for all using (public.is_admin()) with check (public.is_admin());

-- customers: o próprio cliente vê/edita seu registro; admin vê/edita todos.
create policy "customers_select_own_or_admin" on public.customers
  for select using (auth_user_id = auth.uid() or public.is_admin());
create policy "customers_insert_own_or_admin" on public.customers
  for insert with check (auth_user_id = auth.uid() or public.is_admin());
create policy "customers_update_own_or_admin" on public.customers
  for update using (auth_user_id = auth.uid() or public.is_admin());

-- orders: o cliente vê só seus pedidos; admin vê e edita todos.
create policy "orders_select_own_or_admin" on public.orders
  for select using (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
    or public.is_admin()
  );
create policy "orders_insert_own_or_admin" on public.orders
  for insert with check (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
    or public.is_admin()
  );
create policy "orders_update_admin" on public.orders
  for update using (public.is_admin());

-- order_items: segue a visibilidade do pedido associado.
create policy "order_items_select_via_order" on public.order_items
  for select using (
    order_id in (
      select id from public.orders
      where customer_id in (select id from public.customers where auth_user_id = auth.uid())
      or public.is_admin()
    )
  );
create policy "order_items_write_own_or_admin" on public.order_items
  for insert with check (
    order_id in (
      select id from public.orders
      where customer_id in (select id from public.customers where auth_user_id = auth.uid())
      or public.is_admin()
    )
  );

-- order_status_events: visível para o cliente dono do pedido e para admin;
-- só o admin insere manualmente (o trigger usa security definer).
create policy "order_status_events_select" on public.order_status_events
  for select using (
    order_id in (
      select id from public.orders
      where customer_id in (select id from public.customers where auth_user_id = auth.uid())
      or public.is_admin()
    )
  );

-- quote_requests: o cliente vê/cria os seus; só admin atualiza (preço, status).
create policy "quote_requests_select_own_or_admin" on public.quote_requests
  for select using (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
    or public.is_admin()
  );
create policy "quote_requests_insert_own" on public.quote_requests
  for insert with check (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );
create policy "quote_requests_update_admin" on public.quote_requests
  for update using (public.is_admin());

-- support_requests: mesmo padrão de quote_requests.
create policy "support_requests_select_own_or_admin" on public.support_requests
  for select using (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
    or public.is_admin()
  );
create policy "support_requests_insert_own" on public.support_requests
  for insert with check (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );
create policy "support_requests_update_admin" on public.support_requests
  for update using (public.is_admin());

-- product_reviews: dono do pedido vê/cria a própria avaliação, admin vê
-- todas; leitura pública (carrossel de avaliações no site).
create policy "product_reviews_select_public" on public.product_reviews
  for select using (true);
create policy "product_reviews_insert_own" on public.product_reviews
  for insert with check (
    customer_id in (select id from public.customers where auth_user_id = auth.uid())
  );

-- promotions: leitura pública; escrita só admin.
create policy "promotions_select_public" on public.promotions
  for select using (true);
create policy "promotions_write_admin" on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime (contador de pedidos pendentes ao vivo no painel admin)
-- ─────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.orders;

-- ─────────────────────────────────────────────────────────────────────────
-- Storage
-- ─────────────────────────────────────────────────────────────────────────

-- Imagens de produto, enviadas pelo admin.
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "products_bucket_select_public" on storage.objects
  for select using (bucket_id = 'products');
create policy "products_bucket_insert_admin" on storage.objects
  for insert with check (bucket_id = 'products' and public.is_admin());
create policy "products_bucket_update_admin" on storage.objects
  for update using (bucket_id = 'products' and public.is_admin());
create policy "products_bucket_delete_admin" on storage.objects
  for delete using (bucket_id = 'products' and public.is_admin());

-- Foto de perfil do cliente — cada um só mexe na própria pasta (<auth_user_id>/...).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_bucket_select_public" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_bucket_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_bucket_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_bucket_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fotos de referência anexadas a um pedido de orçamento — mesmo padrão de avatars.
insert into storage.buckets (id, name, public)
values ('quotes', 'quotes', true)
on conflict (id) do nothing;

create policy "quotes_bucket_select_public" on storage.objects
  for select using (bucket_id = 'quotes');
create policy "quotes_bucket_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'quotes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
create policy "quotes_bucket_delete_own" on storage.objects
  for delete using (
    bucket_id = 'quotes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- Imagens de gravação anexadas no checkout (logo/arte a gravar na peça).
-- Insert é público (sem exigir auth.uid()) porque o checkout de convidado
-- não tem sessão — são só imagens de referência para produção, sem dado
-- sensível; a exclusão fica restrita ao admin para evitar abuso.
insert into storage.buckets (id, name, public)
values ('engravings', 'engravings', true)
on conflict (id) do nothing;

create policy "engravings_bucket_select_public" on storage.objects
  for select using (bucket_id = 'engravings');
create policy "engravings_bucket_insert_public" on storage.objects
  for insert with check (bucket_id = 'engravings');
create policy "engravings_bucket_delete_admin" on storage.objects
  for delete using (bucket_id = 'engravings' and public.is_admin());

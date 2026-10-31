-- Central de notificações do painel admin + notificações push (Web Push)
-- no celular do dono da loja. As notificações são criadas pelas edge
-- functions (pedido novo em create-order/guest-checkout-order, pagamento
-- aprovado em mercadopago-webhook — ver _shared/adminNotifications.ts),
-- que também disparam o push para cada aparelho inscrito.

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- new_order | payment_approved
  title text not null,
  body text,
  url text, -- rota do admin aberta ao tocar na notificação
  order_id uuid references public.orders(id) on delete cascade,
  -- Lida por qualquer admin = lida para todos (loja pequena, um painel só).
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index admin_notifications_created_at_idx
  on public.admin_notifications (created_at desc);

alter table public.admin_notifications enable row level security;

create policy "admin_notifications: admin gerencia"
  on public.admin_notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- Realtime: o sininho do painel atualiza sozinho quando chega notificação.
alter publication supabase_realtime add table public.admin_notifications;

-- Cada navegador/celular em que um admin ativou as notificações. Os campos
-- vêm de PushSubscription.toJSON() no navegador.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: admin gerencia os próprios aparelhos"
  on public.push_subscriptions
  for all
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());

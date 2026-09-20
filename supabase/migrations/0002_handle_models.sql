-- Modelos de alça/cabo cadastrados pelo admin, usados na calculadora de
-- orçamento sob medida (/orcamento) no lugar do antigo checkbox binário
-- "tem cabo/alça" com sobretaxa fixa. Mesmo padrão de shipping_methods.

create table public.handle_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_surcharge numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger handle_models_set_updated_at before update on public.handle_models
  for each row execute function public.set_updated_at();

alter table public.handle_models enable row level security;

create policy "handle_models_select_public" on public.handle_models
  for select using (true);
create policy "handle_models_write_admin" on public.handle_models
  for all using (public.is_admin()) with check (public.is_admin());

-- Não insere um "Sem cabo/alça" aqui: a página pública já injeta essa
-- opção fixa (value vazio, sem sobretaxa) antes das opções cadastradas.
insert into public.handle_models (name, price_surcharge) values
  ('Alça reta', 60),
  ('Alça em U (furo e canaleta)', 90);

-- Troca o boolean por uma referência ao modelo escolhido. Sem dados reais
-- ainda (tabela vazia), então é uma remoção limpa em vez de manter coluna.
alter table public.quote_requests drop column has_handle;
alter table public.quote_requests
  add column handle_model_id uuid references public.handle_models (id) on delete set null;

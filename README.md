# Malatrasi WoodWorks — loja online

Loja de marcenaria artesanal (React + Vite + Tailwind), com carrinho, contas
de cliente, orçamento sob encomenda, painel de administração e notificações
por email a cada mudança de status do pedido.

## Stack

- React + Vite + TypeScript, Tailwind CSS, React Router
- Supabase (Postgres + Auth + Edge Functions) como backend
- Resend para email transacional

Sem gateway de pagamento por enquanto — o cliente escolhe a forma de
pagamento (Pix, transferência, dinheiro ou a combinar) no checkout, e o
pagamento é combinado diretamente com a loja após a confirmação do pedido.

## Colocando no ar (primeira vez)

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute em ordem:
   - `supabase/migrations/0001_init.sql` (tabelas, RLS, triggers, storage)
   - `supabase/seed.sql` (catálogo inicial ilustrativo)
3. Em **Project Settings → API**, copie `Project URL` e a chave `anon public`.
4. Copie `.env.example` para `.env` e preencha:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

### 3. Criar seu primeiro usuário administrador

1. No Supabase → **Authentication → Users → Add user**, crie um usuário com
   email/senha (será seu login em `/admin/login`).
2. No **SQL Editor**, dê papel de admin a ele (substitua o email):
   ```sql
   insert into public.profiles (id, role)
   select id, 'admin' from auth.users where email = 'seu-email@malatrasiwoodworks.com.br';
   ```

### 4. Publicar a função de notificações (email)

Requer o [CLI do Supabase](https://supabase.com/docs/guides/cli):

```bash
supabase login
supabase link --project-ref <seu-project-ref>
supabase functions deploy notify-order-status
supabase functions deploy notify-support-request
supabase functions deploy notify-new-quote
supabase functions deploy guest-checkout-order
supabase functions deploy guest-checkout-draft
supabase functions deploy claim-guest-customer
supabase functions deploy invite-admin
supabase functions deploy invite-customer
supabase functions deploy list-admin-users
supabase functions deploy revoke-admin
supabase functions deploy set-user-ban
```

Configure os secrets das funções (Project Settings → Edge Functions →
Secrets, ou via CLI):

```bash
supabase secrets set RESEND_API_KEY=re_xxxxx
supabase secrets set RESEND_FROM_EMAIL="Malatrasi WoodWorks <pedidos@malatrasiwoodworks.com.br>"
supabase secrets set STORE_ADMIN_EMAIL="contato@malatrasiwoodworks.com.br"
supabase secrets set SITE_URL="https://malatrasiwoodworks.com.br"
```

O remetente do Resend precisa pertencer a um domínio verificado na sua conta
Resend (ou use o domínio de testes enquanto isso).

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

## Rotas principais

| Rota | Descrição |
|---|---|
| `/` `/produtos` `/produto/:slug` | Loja pública |
| `/orcamento` | Pedido de orçamento sob medida (peças sob encomenda) |
| `/cadastro` `/login` | Conta do cliente |
| `/carrinho` | Carrinho e checkout (requer login ou checkout como convidado) |
| `/conta/pedidos` `/conta/orcamentos` | Acompanhamento de pedidos e orçamentos do cliente |
| `/admin/login` | Acesso ao painel |
| `/admin/pedidos` `/admin/pedidos/:id` | Gestão de pedidos, mudança de status |
| `/admin/orcamentos` | Gestão de orçamentos sob encomenda, conversão em pedido |
| `/admin/produtos` | Cadastro/edição/remoção de produtos |
| `/admin/clientes` | Listagem e ficha de clientes |

## Notas de segurança

- A `service_role key` do Supabase **nunca** deve ser usada no frontend —
  só na Edge Function (já isolada em `supabase/functions/`).
- O acesso ao painel admin depende do papel salvo em `public.profiles`, não
  de nenhuma checagem no cliente — é reforçado por Row Level Security no
  banco de dados.

# Malatrasi WoodWorks — loja online

Loja de marcenaria artesanal (React + Vite + Tailwind), com carrinho, contas
de cliente, orçamento sob encomenda, painel de administração e notificações
por email a cada mudança de status do pedido.

## Stack

- React + Vite + TypeScript, Tailwind CSS, React Router
- Supabase (Postgres + Auth + Edge Functions) como backend
- Resend para email transacional

Pagamento online pelo Mercado Pago (Checkout Pro): o pedido é criado no
site e o cliente é levado à página do Mercado Pago para pagar com Pix,
cartão ou boleto. O webhook do Mercado Pago atualiza o pedido sozinho.

## Colocando no ar (primeira vez)

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute em ordem:
   - todos os arquivos de `supabase/migrations/` em ordem numérica (`0001_init.sql` … `0016_…`;
     o `0004_mercadopago.sql` cria as colunas do Mercado Pago)
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
supabase functions deploy create-order
supabase functions deploy create-mercadopago-preference
# o Mercado Pago chama o webhook sem login do Supabase — precisa do --no-verify-jwt
supabase functions deploy mercadopago-webhook --no-verify-jwt
supabase functions deploy google-reviews
supabase functions deploy admin-push
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
# opcional — destino do aviso de pedido novo (padrão: malatrasiww@gmail.com)
supabase secrets set ORDER_NOTIFY_EMAIL="malatrasiww@gmail.com"
supabase secrets set SITE_URL="https://malatrasiwoodworks.com.br"
```

Mercado Pago (credenciais em mercadopago.com.br/developers → Suas
integrações → sua aplicação):

```bash
# produção começa com APP_USR- ; credencial de teste (TEST-) abre o sandbox
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx
# chave secreta mostrada em Webhooks → Configurar notificações
supabase secrets set MERCADOPAGO_WEBHOOK_SECRET=xxxxx
```

No painel da aplicação, em **Webhooks → Configurar notificações**, no modo
**Produção**: URL `https://<seu-project-ref>.supabase.co/functions/v1/mercadopago-webhook`
e evento **Pagamentos** marcado. Sem `MERCADOPAGO_WEBHOOK_SECRET` o webhook
ignora as notificações e os pedidos não saem de "pendente".

Notificações de venda no celular (Web Push). Gere o par de chaves uma vez
e guarde: trocar as chaves obriga a ativar as notificações de novo em cada
aparelho.

```bash
npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=<Public Key>
supabase secrets set VAPID_PRIVATE_KEY=<Private Key>
supabase secrets set VAPID_SUBJECT="mailto:malatrasiww@gmail.com"
```

O remetente do Resend precisa pertencer a um domínio verificado na sua conta
Resend (ou use o domínio de testes enquanto isso).

### 5. Notificações de venda no Android do dono da loja

A cada pedido novo e a cada pagamento aprovado pelo Mercado Pago, o painel
grava uma notificação na central (`/admin/notificacoes`, sininho no topo do
painel) e manda um push para os celulares em que um admin ativou as
notificações. Para ativar no Android:

1. No **Chrome** do celular, entre em `/admin` com o login de admin.
2. Menu do Chrome (⋮) → **Adicionar à tela inicial** / **Instalar app** — o
   painel passa a abrir como um app e as notificações tocando nele abrem
   direto o pedido. (Funciona também sem instalar, pelo próprio Chrome.)
3. Abra **Notificações** no painel → **Ativar notificações** → permita. Chega
   uma notificação de teste na hora.
4. Se as notificações atrasarem com a tela apagada, em Configurações do
   Android → Apps → Chrome (ou o app instalado) → Bateria, deixe **Sem
   restrições**.

No iPhone só funciona com o painel adicionado à Tela de Início (iOS 16.4+).

### 6. Rodar em desenvolvimento

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

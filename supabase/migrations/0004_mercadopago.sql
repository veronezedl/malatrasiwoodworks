-- Integração de pagamento online via Mercado Pago (Checkout Pro), como
-- opção a mais além de Pix/Dinheiro/A combinar (que continuam existindo).

alter type public.payment_method add value 'mercadopago';
alter type public.payment_status add value 'failed';

alter table public.orders add column mp_preference_id text;
alter table public.orders add column mp_payment_id text;
-- Status bruto devolvido pelo Mercado Pago (approved/pending/rejected/...),
-- só para auditoria/debug do admin — quem manda no fluxo é payment_status.
alter table public.orders add column mp_status text;

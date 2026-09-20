// Supabase Edge Function: mercadopago-webhook
//
// Recebe a notificação que o Mercado Pago envia quando um pagamento muda de
// status (configurado no painel do Mercado Pago apontando pra esta URL).
// Não é chamada pelo navegador — roda sem sessão do Supabase (verify_jwt
// desligado no deploy) e usa o service role pra atualizar o pedido, mesmo
// padrão de guest-checkout-order.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)
//   MERCADOPAGO_ACCESS_TOKEN    mesma credencial usada pra criar a preference
//   MERCADOPAGO_WEBHOOK_SECRET  "chave secreta" mostrada ao configurar a
//                                notification_url no painel do Mercado Pago
//                                (Suas integrações → aplicação → Webhooks)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Valida a assinatura conforme documentado pelo Mercado Pago: o header
// x-signature vem como "ts=<timestamp>,v1=<hash>"; o hash é um
// HMAC-SHA256(webhook secret) do manifest "id:<dataId>;request-id:<x-request-id>;ts:<ts>;".
async function isValidSignature(
  req: Request,
  dataId: string,
  secret: string,
): Promise<boolean> {
  const signatureHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");
  if (!signatureHeader || !requestId) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [key, value] = p.split("=");
      return [key?.trim(), value?.trim()];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(manifest),
  );
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHex === v1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    // O Mercado Pago manda o id do pagamento tanto na query string
    // (?data.id=...) quanto no corpo ({ data: { id } }), dependendo do
    // formato da notificação — aceita os dois.
    const dataId: string | undefined =
      body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? undefined;
    const type: string | undefined = body?.type ?? url.searchParams.get("type") ?? undefined;

    if (!dataId || type !== "payment") {
      // Outros tipos de evento (merchant_order, etc.) — só confirma recebido.
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!webhookSecret || !accessToken) {
      // Ainda não configurado — não há como validar nem consultar o
      // pagamento; responde 200 pra não gerar reenvio, mas não processa.
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validSignature = await isValidSignature(req, dataId, webhookSecret);
    if (!validSignature) {
      return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Nunca confia no status que vem no webhook — busca o pagamento real.
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!paymentRes.ok) {
      console.error("Não foi possível buscar o pagamento no Mercado Pago:", await paymentRes.text());
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payment = await paymentRes.json();
    const orderId: string | undefined = payment.external_reference;
    const mpStatus: string = payment.status; // approved | pending | in_process | rejected | cancelled | refunded

    if (!orderId) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, payment_status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentStatus =
      mpStatus === "approved" ? "paid" : ["rejected", "cancelled"].includes(mpStatus) ? "failed" : "pending";

    const updates: Record<string, unknown> = {
      mp_payment_id: String(payment.id),
      mp_status: mpStatus,
      payment_status: paymentStatus,
    };

    // Pagamento aprovado avança o pedido pra "confirmed" automaticamente —
    // só se ele ainda estiver "pending", pra não regredir um pedido que o
    // admin já moveu adiante manualmente (ex.: um webhook atrasado/repetido).
    const shouldAdvanceStatus = mpStatus === "approved" && order.status === "pending";
    if (shouldAdvanceStatus) {
      updates.status = "confirmed";
    }

    await supabase.from("orders").update(updates).eq("id", orderId);

    if (shouldAdvanceStatus) {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-order-status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, status: "confirmed", isNewOrder: false }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    // Responde 200 mesmo em erro interno pra evitar reenvio infinito do MP
    // por um bug pontual — o erro já ficou registrado no log da função.
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

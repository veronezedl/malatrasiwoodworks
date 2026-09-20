// Supabase Edge Function: notify-order-status
//
// Disparada sempre que um pedido é criado ou muda de status (ver
// src/lib/api/orders.ts → updateOrderStatus). Envia um email transacional
// via Resend ao cliente e, se for um pedido novo, um aviso ao admin. Se
// faltar alguma credencial, a notificação é simplesmente omitida sem
// quebrar o fluxo — o pedido/status já ficou salvo no banco de qualquer forma.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL            ex: "Malatrasi WoodWorks <pedidos@malatrasiwoodworks.com.br>"
//   STORE_ADMIN_EMAIL            para o aviso de pedido novo ao admin

import { createClient } from "jsr:@supabase/supabase-js@2";
import { renderProposalEmailHtml } from "../_shared/emailTemplate.ts";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  processing: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Recebemos seu pedido e estamos revisando.",
  confirmed: "Seu pedido foi confirmado e logo entrará em produção.",
  processing: "Seu pedido está sendo preparado.",
  shipped: "Seu pedido está a caminho!",
  delivered: "Seu pedido foi entregue. Obrigado por comprar na Malatrasi WoodWorks!",
  cancelled: "Seu pedido foi cancelado.",
  refunded: "Seu pedido foi reembolsado.",
};

// Mesmos 5 passos e mesma ordem que <OrderTracker> no site
// (src/components/customer/OrderTracker.tsx).
const TRACKER_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface OrderItemRow {
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  product: { image_url: string } | null;
}

// Réplica em tabelas (HTML de email) do stepper horizontal do app — círculo
// + linha conectora, com as mesmas 5 etapas e cores da marca.
function renderTracker(status: string): string {
  if (status === "cancelled" || status === "refunded") {
    return `
      <tr>
        <td style="padding:20px 0 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background:#fdecee;border-radius:12px;padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#b91c1c;">
                Este pedido está ${STATUS_LABELS[status].toLowerCase()}.
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  const currentIndex = TRACKER_STEPS.indexOf(status);
  const colWidth = 104;
  const circleSize = 26;
  const lineHeight = 1;
  const halfLine = Math.round((colWidth - circleSize) / 2);

  // A div interna (em vez de estilizar o <td> diretamente) é necessária
  // porque o Gmail ignora "height" no td e usa a altura de linha padrão da
  // fonte, deixando a barra muito mais grossa do que o pedido.
  const lineDiv = (color: string) =>
    `<div style="height:${lineHeight}px;line-height:${lineHeight}px;font-size:1px;background:${color};">&nbsp;</div>`;

  const cells = TRACKER_STEPS.map((step, i) => {
    const done = i <= currentIndex;
    const circleBg = done ? "#b28d3e" : "#f1ece2";
    const circleColor = done ? "#ffffff" : "#6b5f4f";
    const leftLineColor = i === 0 ? "#ffffff" : done ? "#b28d3e" : "#e5e5e5";
    const rightLineColor =
      i === TRACKER_STEPS.length - 1 ? "#ffffff" : i < currentIndex ? "#b28d3e" : "#e5e5e5";
    const labelColor = done ? "#1f1710" : "#6b5f4f";

    return `
      <td width="${colWidth}" style="width:${colWidth}px;text-align:center;vertical-align:top;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="${halfLine}" style="width:${halfLine}px;padding:0;">${lineDiv(leftLineColor)}</td>
            <td width="${circleSize}" style="width:${circleSize}px;height:${circleSize}px;line-height:${circleSize}px;border-radius:${circleSize / 2}px;background:${circleBg};color:${circleColor};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;text-align:center;">
              ${done ? "&#10003;" : i + 1}
            </td>
            <td width="${halfLine}" style="width:${halfLine}px;padding:0;">${lineDiv(rightLineColor)}</td>
          </tr>
        </table>
        <div style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:600;line-height:1.3;color:${labelColor};">
          ${STATUS_LABELS[step]}
        </div>
      </td>`;
  }).join("");

  return `
    <tr>
      <td style="padding:20px 0 4px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>${cells}</tr>
        </table>
      </td>
    </tr>`;
}

function renderItems(items: OrderItemRow[]): string {
  return items
    .map((item) => {
      const imgHtml = item.product?.image_url
        ? `<img src="${item.product.image_url}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:8px;object-fit:cover;" />`
        : `<div style="width:56px;height:56px;border-radius:8px;background:#f1ece2;"></div>`;

      return `
        <tr>
          <td width="56" style="padding:12px 0;border-bottom:1px solid #eeeeee;">${imgHtml}</td>
          <td style="padding:12px;border-bottom:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:14px;color:#1f1710;">${item.product_name}</div>
            <div style="margin-top:2px;font-size:12px;color:#6b5f4f;">${item.quantity} × ${currencyFmt.format(item.unit_price)}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eeeeee;text-align:right;white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1f1710;">
            ${currencyFmt.format(item.quantity * item.unit_price)}
          </td>
        </tr>`;
    })
    .join("");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, status, isNewOrder } = await req.json();
    if (!orderId || !status) {
      return new Response(JSON.stringify({ error: "orderId e status são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "*, customer:customers(full_name, email, phone), order_items(product_id, product_name, unit_price, quantity, product:products(image_url))",
      )
      .eq("id", orderId)
      .single();
    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusLabel = STATUS_LABELS[status] ?? status;
    const statusMessage = STATUS_MESSAGES[status] ?? "";

    let notifiedEmail = false;

    // ─── Email via Resend ───────────────────────────────────────────────
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://malatrasi-woodworks.vercel.app";

    if (resendKey && fromEmail && isNewOrder) {
      // Pedido novo: extrato de itens/valores no layout "Proposta Comercial"
      // (ver ../_shared/emailTemplate.ts), no lugar do email com tracker —
      // esse é o "extrato do pedido" pedido pelo cliente. Mudanças de status
      // seguintes continuam usando o tracker, no bloco abaixo.
      const items = (order.order_items ?? []) as OrderItemRow[];
      // Pedido pago via Mercado Pago só é criado ANTES do redirect pro
      // checkout — nesse momento ainda não sabemos se o pagamento foi
      // aprovado, então o e-mail de criação não pode dizer "confirmado".
      // A confirmação de verdade chega depois via mercadopago-webhook
      // (status muda pra "confirmed", cai no ramo de tracker abaixo).
      const isPendingMercadoPago =
        order.payment_method === "mercadopago" && order.payment_status !== "paid";
      const paymentInfo =
        order.payment_method === "mercadopago"
          ? order.payment_status === "paid"
            ? "Já pago via Mercado Pago."
            : "Pendente — pagamento pelo Mercado Pago."
          : undefined;
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: order.customer.email,
          subject: isPendingMercadoPago
            ? `Pedido ${order.order_number} recebido — Malatrasi WoodWorks`
            : `Pedido ${order.order_number} confirmado — Malatrasi WoodWorks`,
          html: renderProposalEmailHtml({
            kind: "pedido",
            customerName: order.customer.full_name,
            heading: isPendingMercadoPago
              ? `Pedido recebido — ${order.order_number}`
              : `Pedido confirmado — ${order.order_number}`,
            introText: isPendingMercadoPago
              ? "Recebemos seu pedido! Assim que o Mercado Pago confirmar o pagamento, seu pedido é confirmado automaticamente."
              : "Recebemos seu pedido! Confira abaixo os itens e valores. Você pode acompanhar o status na sua conta.",
            items: items.map((item) => ({
              description: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              total: item.unit_price * item.quantity,
            })),
            subtotal: order.subtotal,
            shippingCost: order.shipping_cost ?? 0,
            shippingLabel: order.shipping_method_name,
            total: order.total,
            estimatedDays: null,
            isEstimate: false,
            paymentInfo,
            siteUrl,
          }),
        }),
      });
      notifiedEmail = emailRes.ok;
    } else if (resendKey && fromEmail) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: order.customer.email,
          subject: `Pedido ${order.order_number} · ${statusLabel}`,
          html: `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1ece2;padding:32px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;background:#ffffff;border-radius:12px;">
                    <tr>
                      <td style="padding:32px 32px 24px;">
                        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b28d3e;">
                          Malatrasi WoodWorks
                        </div>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
                          <tr>
                            <td style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#1f1710;">
                              Pedido ${order.order_number}
                            </td>
                            <td align="right" style="white-space:nowrap;">
                              <span style="display:inline-block;background:#f1ece2;color:#1f1710;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;padding:6px 14px;border-radius:999px;">
                                ${statusLabel}
                              </span>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f1710;">
                          Olá ${order.customer.full_name},
                        </p>
                        <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f1710;">
                          ${statusMessage}
                        </p>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          ${renderTracker(status)}
                        </table>

                        <div style="margin-top:28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#6b5f4f;">
                          Itens
                        </div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
                          ${renderItems((order.order_items ?? []) as OrderItemRow[])}
                        </table>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
                          <tr>
                            <td style="padding:10px 0 0;color:#6b5f4f;">Subtotal</td>
                            <td style="padding:10px 0 0;text-align:right;color:#6b5f4f;">${currencyFmt.format(order.subtotal)}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0 0;color:#6b5f4f;">Entrega${order.shipping_method_name ? ` (${order.shipping_method_name})` : ""}</td>
                            <td style="padding:4px 0 0;text-align:right;color:#6b5f4f;">${currencyFmt.format(order.shipping_cost ?? 0)}</td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0 0;border-top:1px solid #eeeeee;font-weight:700;color:#1f1710;font-size:15px;">Total</td>
                            <td style="padding:10px 0 0;border-top:1px solid #eeeeee;text-align:right;font-weight:700;color:#1f1710;font-size:15px;">${currencyFmt.format(order.total)}</td>
                          </tr>
                        </table>

                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
                          <tr>
                            <td style="background:#f1ece2;border-radius:12px;padding:16px;font-family:Arial,Helvetica,sans-serif;">
                              <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;color:#6b5f4f;">
                                Endereço de entrega
                              </div>
                              <div style="margin-top:6px;font-size:13px;line-height:1.6;color:#1f1710;">
                                ${order.shipping_full_name}<br />
                                ${order.shipping_address_line1}${order.shipping_address_line2 ? `, ${order.shipping_address_line2}` : ""}<br />
                                ${order.shipping_neighborhood ? `${order.shipping_neighborhood} · ` : ""}${order.shipping_postal_code} ${order.shipping_city}${order.shipping_region ? `, ${order.shipping_region}` : ""}<br />
                                ${order.shipping_country_code}
                              </div>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b5f4f;text-align:center;">
                          Dúvidas sobre seu pedido? Responda este email e te ajudamos.<br />
                          Obrigado por comprar na Malatrasi WoodWorks.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          `,
        }),
      });
      notifiedEmail = emailRes.ok;
    }

    // ─── Aviso ao admin de pedido novo (só na criação, não a cada mudança
    // de status posterior) ────────────────────────────────────────────────
    if (isNewOrder) {
      const adminEmail = Deno.env.get("STORE_ADMIN_EMAIL");
      if (resendKey && fromEmail && adminEmail) {
        const items = (order.order_items ?? []) as OrderItemRow[];
        const itemsList = items
          .map((item) => `${item.quantity} × ${item.product_name}`)
          .join("<br />");
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: adminEmail,
            subject: `Novo pedido ${order.order_number} · ${currencyFmt.format(order.total)}`,
            html: `
              <div style="font-family:Inter,Arial,sans-serif;color:#1f1710;max-width:480px;margin:0 auto">
                <h1 style="color:#1f1710;font-size:20px">Novo pedido recebido</h1>
                <p style="font-size:15px">Pedido <strong>${order.order_number}</strong> · ${currencyFmt.format(order.total)}</p>
                <p style="font-size:15px">Cliente: <strong>${order.customer.full_name}</strong> (${order.customer.email}, ${order.customer.phone})</p>
                <p style="font-size:14px;color:#6b5f4f">${itemsList}</p>
                <p style="font-size:14px;color:#6b5f4f">Pagamento: ${order.payment_method}</p>
              </div>
            `,
          }),
        });
      }
    }

    // Marca a notificação no último evento deste status.
    await supabase
      .from("order_status_events")
      .update({ notified_email: notifiedEmail })
      .eq("order_id", orderId)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ notifiedEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

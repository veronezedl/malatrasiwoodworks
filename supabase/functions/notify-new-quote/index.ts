// Supabase Edge Function: notify-new-quote
//
// Disparada quando um cliente envia um pedido de orçamento sob encomenda
// (ver src/lib/api/quotes.ts → createQuoteRequest e
// supabase/functions/guest-quote-request). Envia um email interno à equipe
// da Malatrasi WoodWorks e, também, um email de confirmação ao cliente no
// layout "Proposta Comercial" (ver ../_shared/emailTemplate.ts).
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL
//   STORE_ADMIN_EMAIL     ex: "contato@malatrasiwoodworks.com.br"
//   SITE_URL              ex: "https://malatrasi-woodworks.vercel.app" (usado para a URL do logo no e-mail)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { renderProposalEmailHtml } from "../_shared/emailTemplate.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: "quoteId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: quote, error: quoteError } = await supabase
      .from("quote_requests")
      .select("*, customer:customers(full_name, email, phone)")
      .eq("id", quoteId)
      .single();
    if (quoteError || !quote) {
      return new Response(JSON.stringify({ error: "Orçamento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notified = false;
    let customerEmailError: string | null = null;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const adminEmail = Deno.env.get("STORE_ADMIN_EMAIL");
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://malatrasi-woodworks.vercel.app";

    if (resendKey && fromEmail && adminEmail) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: adminEmail,
          reply_to: quote.customer.email,
          subject: `Novo pedido de orçamento sob encomenda`,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;color:#1f1710;max-width:480px;margin:0 auto">
              <h1 style="color:#1f1710;font-size:20px">Novo pedido de orçamento</h1>
              <p style="font-size:15px">Cliente: <strong>${quote.customer.full_name}</strong> (${quote.customer.email}, ${quote.customer.phone})</p>
              ${quote.wood_type ? `<p style="font-size:15px">Madeira desejada: <strong>${quote.wood_type}</strong></p>` : ""}
              ${quote.dimensions ? `<p style="font-size:15px">Dimensões: <strong>${quote.dimensions}</strong></p>` : ""}
              <p style="background:#f1ece2;border-radius:12px;padding:12px 16px;font-size:14px;color:#6b5f4f;white-space:pre-wrap">${quote.description}</p>
              ${quote.reference_image_url ? `<p style="font-size:14px"><a href="${quote.reference_image_url}">Ver imagem de referência</a></p>` : ""}
            </div>
          `,
        }),
      });
      notified = emailRes.ok;
    }

    // Confirmação ao cliente, no layout "Proposta Comercial" — só o admin
    // recebia notificação até aqui.
    if (resendKey && fromEmail) {
      const dimensionsLabel =
        quote.width_cm && quote.length_cm
          ? `${quote.width_cm} x ${quote.length_cm}${quote.height_cm ? ` x ${quote.height_cm}` : ""} cm`
          : quote.dimensions;
      const itemDescription = [quote.description, dimensionsLabel]
        .filter(Boolean)
        .join(" — ");

      const customerEmailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: quote.customer.email,
          subject: "Recebemos seu pedido de orçamento — Malatrasi WoodWorks",
          html: renderProposalEmailHtml({
            kind: "orcamento",
            customerName: quote.customer.full_name,
            heading: "Solicitação de orçamento recebida",
            introText:
              "Recebemos seu pedido de orçamento sob medida e vamos analisar os detalhes. Em breve entramos em contato para confirmar o valor final.",
            items: [
              {
                description: itemDescription,
                quantity: 1,
                unitPrice: quote.estimated_price ?? null,
                total: quote.estimated_price ?? null,
              },
            ],
            subtotal: quote.estimated_price ?? null,
            total: quote.estimated_price ?? null,
            estimatedDays: null,
            isEstimate: true,
            siteUrl,
          }),
        }),
      });
      if (!customerEmailRes.ok) {
        customerEmailError = await customerEmailRes.text();
      }
    }

    return new Response(JSON.stringify({ notified, customerEmailError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

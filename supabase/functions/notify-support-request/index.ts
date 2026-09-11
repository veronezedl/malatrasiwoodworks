// Supabase Edge Function: notify-support-request
//
// Disparada quando um cliente envia uma solicitação de suporte pela conta
// dele (ver src/lib/api/support.ts → createSupportRequest). Envia um email
// à equipe da Malatrasi WoodWorks com os dados do cliente e a mensagem.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL
//   STORE_ADMIN_EMAIL     ex: "contato@malatrasiwoodworks.com.br"

import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: "requestId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: request, error: requestError } = await supabase
      .from("support_requests")
      .select("*, customer:customers(full_name, email, phone), order:orders(order_number)")
      .eq("id", requestId)
      .single();
    if (requestError || !request) {
      return new Response(JSON.stringify({ error: "Solicitação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notified = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const adminEmail = Deno.env.get("STORE_ADMIN_EMAIL");
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
          reply_to: request.customer.email,
          subject: `Nova solicitação de suporte · ${request.subject}`,
          html: `
            <div style="font-family:Inter,Arial,sans-serif;color:#1f1710;max-width:480px;margin:0 auto">
              <h1 style="color:#1f1710;font-size:20px">Nova solicitação de suporte</h1>
              <p style="font-size:15px">Cliente: <strong>${request.customer.full_name}</strong> (${request.customer.email}, ${request.customer.phone})</p>
              ${request.order ? `<p style="font-size:15px">Pedido relacionado: <strong>${request.order.order_number}</strong></p>` : ""}
              <p style="font-size:15px">Assunto: <strong>${request.subject}</strong></p>
              <p style="background:#f1ece2;border-radius:12px;padding:12px 16px;font-size:14px;color:#6b5f4f;white-space:pre-wrap">${request.message}</p>
            </div>
          `,
        }),
      });
      notified = emailRes.ok;
    }

    return new Response(JSON.stringify({ notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

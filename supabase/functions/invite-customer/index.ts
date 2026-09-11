// Supabase Edge Function: invite-customer
//
// Disparada pelo painel admin (AdminCustomerQuickView.tsx → botão "Convidar
// para completar cadastro") para um cliente "pré-cadastro" (checkout de
// convidado, sem conta de login). Gera um link de convite com a Admin API
// do Supabase Auth e manda um email próprio via Resend (não o template
// padrão do Supabase) com esse link, que leva a /redefinir-senha para o
// cliente definir sua senha.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL
//   SITE_URL   ex: "https://malatrasiwoodworks.com.br" (usado no link de convite)

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
    const { customerId } = await req.json();
    if (!customerId) {
      return new Response(JSON.stringify({ error: "customerId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, full_name, email, auth_user_id")
      .eq("id", customerId)
      .maybeSingle();
    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: "Cliente não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (customer.auth_user_id) {
      return new Response(
        JSON.stringify({ error: "Este cliente já tem uma conta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!customer.email) {
      return new Response(
        JSON.stringify({ error: "Este cliente ainda não tem email salvo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email: customer.email,
      options: { redirectTo: `${siteUrl}/redefinir-senha` },
    });
    if (linkError || !linkData) {
      const alreadyRegistered = linkError?.message?.toLowerCase().includes("already");
      return new Response(
        JSON.stringify({
          error: alreadyRegistered
            ? "Já existe uma conta com este email. Peça ao cliente para fazer login."
            : linkError?.message ?? "Não foi possível gerar o convite.",
        }),
        { status: alreadyRegistered ? 409 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const actionLink = linkData.properties.action_link;

    let notified = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    if (resendKey && fromEmail) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: customer.email,
          subject: "Complete seu cadastro na Malatrasi WoodWorks",
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;color:#1f1710;max-width:480px;margin:0 auto">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b28d3e;">Malatrasi WoodWorks</div>
              <h1 style="color:#1f1710;font-size:20px;margin-top:12px;">Olá${customer.full_name ? ` ${customer.full_name}` : ""}!</h1>
              <p style="font-size:15px;">Você já fez um pedido conosco. Crie sua senha para salvar seus dados, acompanhar seus pedidos e comprar mais rápido na próxima vez.</p>
              <a href="${actionLink}" style="display:inline-block;margin-top:16px;background:#b28d3e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;">Criar minha senha</a>
              <p style="font-size:13px;color:#6b5f4f;margin-top:24px;">Se você não reconhece este pedido, pode ignorar este email.</p>
            </div>
          `,
        }),
      });
      notified = emailRes.ok;
    }

    await supabase
      .from("customers")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", customerId);

    return new Response(JSON.stringify({ success: true, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

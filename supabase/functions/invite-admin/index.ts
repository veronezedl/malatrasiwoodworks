// Supabase Edge Function: invite-admin
//
// Disparada pelo painel admin (AdminUsers.tsx) para convidar uma nova
// pessoa a administrar a Malatrasi WoodWorks. Se o email já tem conta (ex.
// já é cliente), só concede o papel de admin — não precisa de convite novo
// porque já tem senha. Se for um email novo, gera a conta com a Admin API
// do Supabase Auth e manda um email próprio via Resend com o link para
// definir a senha.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)
//   RESEND_API_KEY, RESEND_FROM_EMAIL
//   SITE_URL   ex: "https://malatrasiwoodworks.com.br" (usado no link de convite)

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// supabase-js@2 no runtime Deno das Edge Functions falha com "unrecognized
// JWT kid" ao chamar auth.admin.listUsers() neste projeto (embora
// generateLink() do mesmo módulo funcione bem) — chama direto o endpoint
// REST da Admin API para evitar o bug do SDK.
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users?page=1&per_page=1000`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
  );
  if (!res.ok) throw new Error("Não foi possível consultar os usuários existentes.");
  const body = (await res.json()) as { users: { id: string; email?: string }[] };
  return body.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) return jsonError("email é obrigatório.", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = await requireAdmin(supabase, req);
    if (!auth.ok) return jsonError(auth.message, auth.status);

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      // Já tem conta (ex. já é cliente) — só precisa receber o papel.
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: existingUser.id, role: "admin" });
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true, promoted: true, notified: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${siteUrl}/redefinir-senha` },
    });
    if (linkError || !linkData) {
      return jsonError(linkError?.message ?? "Não foi possível gerar o convite.", 500);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: linkData.user.id, role: "admin" });
    if (profileError) throw profileError;

    const actionLink = linkData.properties.action_link;
    let notified = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    if (resendKey && fromEmail) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: "Você foi convidado para administrar a Malatrasi WoodWorks",
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;color:#1f1710;max-width:480px;margin:0 auto">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#b28d3e;">Malatrasi WoodWorks</div>
              <h1 style="color:#1f1710;font-size:20px;margin-top:12px;">Você foi convidado para o painel de administração</h1>
              <p style="font-size:15px;">Crie sua senha para acessar o admin da Malatrasi WoodWorks.</p>
              <a href="${actionLink}" style="display:inline-block;margin-top:16px;background:#b28d3e;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;">Criar minha senha</a>
              <p style="font-size:13px;color:#6b5f4f;margin-top:24px;">Se você não reconhece este convite, pode ignorar este email.</p>
            </div>
          `,
        }),
      });
      notified = emailRes.ok;
    }

    return new Response(JSON.stringify({ success: true, promoted: false, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro desconhecido", 500);
  }
});

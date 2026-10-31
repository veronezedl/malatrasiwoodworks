// Supabase Edge Function: admin-push
//
// Usada pela tela Notificações do painel (src/pages/admin/AdminNotifications.tsx):
//   { action: "public-key" }  devolve a chave VAPID pública, que o navegador
//                             precisa para se inscrever no push
//   { action: "test" }        manda um push de teste para os aparelhos do
//                             admin que pediu
// Só admins podem chamar.
//
// Variáveis de ambiente: as mesmas de _shared/adminNotifications.ts
// (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT opcional).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { sendPushToAdmins } from "../_shared/adminNotifications.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const auth = await requireAdmin(supabase, req);
    if (!auth.ok) return json({ error: auth.message }, auth.status);

    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    if (!publicKey || !Deno.env.get("VAPID_PRIVATE_KEY")) {
      return json(
        { error: "Notificações push ainda não configuradas (faltam as chaves VAPID no Supabase)." },
        503,
      );
    }

    const { action } = await req.json();

    if (action === "public-key") {
      return json({ publicKey });
    }

    if (action === "test") {
      const delivered = await sendPushToAdmins(
        supabase,
        {
          title: "🔔 Notificações ativadas",
          body: "É assim que cada venda da Malatrasi WoodWorks vai aparecer aqui.",
          url: "/admin/notificacoes",
          tag: "test",
        },
        auth.userId,
      );
      return json({ delivered });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
  }
});

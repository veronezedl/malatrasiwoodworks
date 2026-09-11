// Supabase Edge Function: revoke-admin
//
// Se dispara desde el panel de admin (AdminUsers.tsx → botón "Quitar
// acceso") para bajar a un admin a rol 'customer'. No hay policy de RLS que
// deje a un admin actualizar el profiles.role de OTRO usuario (a propósito
// — una escalada/revocación de rol nunca debería depender solo de RLS),
// así que esto pasa por acá con el service role.
//
// No borra la cuenta — solo quita el acceso al admin. Un admin no puede
// quitarse el acceso a sí mismo (evita quedarse fuera por accidente).
//
// Variables de entorno necesarias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) return jsonError("userId é obrigatório.", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = await requireAdmin(supabase, req);
    if (!auth.ok) return jsonError(auth.message, auth.status);

    if (userId === auth.userId) {
      return jsonError("No puedes quitarte el acceso a ti mismo.", 400);
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "customer" })
      .eq("id", userId);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro desconhecido", 500);
  }
});

// Supabase Edge Function: set-user-ban
//
// Se dispara desde el panel de admin (AdminUsers.tsx → botón "Bloquear
// acceso" / "Desbloquear") para impedir por completo que alguien inicie
// sesión — a diferencia de revoke-admin (que solo quita el rol admin pero
// la cuenta sigue pudiendo entrar como cliente), esto banea la cuenta
// entera vía la Admin API de Supabase Auth (banned_until).
//
// Se llama directo al endpoint REST de la Admin API (no
// supabase.auth.admin.updateUserById()) porque el SDK de supabase-js@2 en
// el runtime de Deno de las Edge Functions falla con "unrecognized JWT kid"
// en varios métodos de auth.admin en este proyecto — ver invite-admin y
// list-admin-users, mismo workaround.
//
// Un admin no puede bloquearse a sí mismo (evita quedarse fuera por
// accidente).
//
// Variables de entorno necesarias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/adminAuth.ts";

// ~100 años — no hay un valor "para siempre" real en la API, este es el
// equivalente práctico que usa la propia documentación de Supabase.
const PERMANENT_BAN_DURATION = "876000h";

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
    const { userId, banned } = await req.json();
    if (!userId || typeof banned !== "boolean") {
      return jsonError("userId y banned (boolean) são obrigatórios.", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = await requireAdmin(supabase, req);
    if (!auth.ok) return jsonError(auth.message, auth.status);

    if (userId === auth.userId) {
      return jsonError("No puedes bloquearte el acceso a ti mismo.", 400);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ban_duration: banned ? PERMANENT_BAN_DURATION : "none" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return jsonError(body?.msg ?? body?.message ?? "No se pudo actualizar el bloqueo.", 500);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro desconhecido", 500);
  }
});

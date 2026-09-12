// Supabase Edge Function: list-admin-users
//
// Se dispara desde el panel de admin (AdminUsers.tsx) para listar quién
// tiene acceso al admin. profiles no guarda el email (vive en auth.users,
// no expuesto por PostgREST), así que hace falta la Admin API para
// resolverlo por cada perfil con role='admin'.
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

// supabase-js@2 en el runtime de Deno de las Edge Functions falla con
// "unrecognized JWT kid" al llamar métodos de auth.admin en este proyecto —
// se llama directo al endpoint REST de la Admin API para evitar el bug del
// SDK (ver invite-admin/index.ts, mismo problema con listUsers()).
async function getUserById(
  id: string,
): Promise<{ email?: string; last_sign_in_at?: string; banned_until?: string } | null> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users/${id}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!res.ok) return null;
  return res.json();
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
    if (!auth.ok) return jsonError(auth.message, auth.status);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true });
    if (profilesError) throw profilesError;

    const admins = await Promise.all(
      (profiles ?? []).map(async (p) => {
        const user = await getUserById(p.id);
        const isBanned = user?.banned_until ? new Date(user.banned_until) > new Date() : false;
        return {
          id: p.id,
          email: user?.email ?? "(conta excluída)",
          created_at: p.created_at,
          last_sign_in_at: user?.last_sign_in_at ?? null,
          is_self: p.id === auth.userId,
          is_banned: isBanned,
        };
      }),
    );

    return new Response(JSON.stringify({ admins }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Erro desconhecido", 500);
  }
});

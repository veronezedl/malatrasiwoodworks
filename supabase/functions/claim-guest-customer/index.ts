// Supabase Edge Function: claim-guest-customer
//
// Se dispara desde RestablecerPassword.tsx justo después de que un usuario
// define su contraseña (tanto para una invitación nueva de un pré-cadastro
// como para un "olvidé mi contraseña" normal — en el segundo caso, es un
// no-op silencioso). Vincula el registro de "customers" con auth_user_id
// nulo que comparte el email del usuario recién autenticado, si existe uno.
//
// No usa una policy de RLS directa porque un UPDATE por "email = ..." podría
// vincular de golpe varias filas duplicadas (ej. dos carritos abandonados
// del mismo invitado) y romper cada lookup por auth_user_id en el resto de
// la app — por eso el orden+limit 1 vive acá, en código, no en SQL declarativo.
//
// Variables de entorno necesarias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (inyectadas automáticamente por Supabase)

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
    if (userError || !userData.user || !userData.user.email) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: candidate } = await supabase
      .from("customers")
      .select("id")
      .eq("email", userData.user.email)
      .is("auth_user_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!candidate) {
      return new Response(JSON.stringify({ claimed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("customers")
      .update({ auth_user_id: userData.user.id })
      .eq("id", candidate.id)
      .select()
      .single();
    if (updateError) throw updateError;

    return new Response(JSON.stringify({ claimed: true, customer: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Supabase Edge Function: guest-checkout-draft
//
// Autosave do checkout de convidado (ver GuestCheckoutForm.tsx) — cada campo
// é salvo assim que o cliente sai dele (onBlur), sem esperar o botão final.
// Só toca customers (nunca cria um pedido). Igual ao resto das escritas do
// checkout de convidado, usa service role porque um cliente anônimo não pode
// inserir/atualizar customers via RLS.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_FIELDS = [
  "full_name",
  "email",
  "phone",
  "cpf_cnpj",
  "address_line1",
  "address_line2",
  "postal_code",
  "city",
  "region",
  "country_code",
  "marketing_opt_in",
] as const;

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
    const body = await req.json();
    const draftCustomerId: string | null = body.draftCustomerId ?? null;
    const rawFields: Record<string, unknown> = body.fields ?? {};

    // Nunca confia no body para nada fora da allow-list, e descarta valores
    // vazios — um blur sem mudanças não deve sobrescrever um dado já salvo.
    const fields: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      const value = rawFields[key];
      if (typeof value === "boolean") {
        fields[key] = value;
      } else if (typeof value === "string" && value.trim()) {
        fields[key] = value;
      }
    }

    if (Object.keys(fields).length === 0) {
      return jsonError("Não há dados para salvar.", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let id: string | null = null;
    if (draftCustomerId) {
      const { data: updated, error: updateError } = await supabase
        .from("customers")
        .update(fields)
        .eq("id", draftCustomerId)
        .is("auth_user_id", null)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      id = updated?.id ?? null;
    }
    if (!id) {
      const { data: inserted, error: insertError } = await supabase
        .from("customers")
        .insert({ ...fields, auth_user_id: null })
        .select("id")
        .single();
      if (insertError) throw insertError;
      id = inserted.id;
    }

    return new Response(JSON.stringify({ draftCustomerId: id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

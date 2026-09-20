// Supabase Edge Function: guest-quote-request
//
// Cria um pedido de orçamento sob encomenda para quem preencheu a
// calculadora em /orcamento sem entrar/criar conta (ver Orcamento.tsx).
// RLS não permite insert em quote_requests sem customer_id vinculado a
// auth.uid(), então esta função usa o service role — mesmo padrão de
// guest-checkout-order. Se o cliente criar uma conta depois com o mesmo
// email, claim-guest-customer vincula esse cadastro automaticamente.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CustomerInput {
  full_name: string;
  email: string;
  phone: string;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateCustomer(customer: CustomerInput | undefined): string | null {
  if (!customer) return "Os dados de contato são obrigatórios.";
  if (!customer.full_name?.trim()) return "Informe seu nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email ?? "")) return "Email inválido.";
  if (!customer.phone?.trim()) return "Informe um telefone de contato.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const customerInput: CustomerInput | undefined = body.customer;
    const description: string = (body.description ?? "").trim();

    const customerError = validateCustomer(customerInput);
    if (customerError) return jsonError(customerError, 400);
    if (!description) return jsonError("Descreva a peça que você deseja.", 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Reaproveita um rascunho existente com o mesmo email (ex.: cliente já
    // tinha começado um checkout de convidado antes) em vez de duplicar.
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", customerInput!.email)
      .is("auth_user_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let customerId: string;
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("customers")
        .update({
          full_name: customerInput!.full_name,
          phone: customerInput!.phone,
        })
        .eq("id", existing.id)
        .select("id")
        .single();
      if (updateError) throw updateError;
      customerId = updated.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("customers")
        .insert({
          full_name: customerInput!.full_name,
          email: customerInput!.email,
          phone: customerInput!.phone,
          auth_user_id: null,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      customerId = inserted.id;
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quote_requests")
      .insert({
        customer_id: customerId,
        description,
        wood_type: body.wood_type || null,
        dimensions: body.dimensions || null,
        reference_image_url: body.reference_image_url || null,
        product_type: body.product_type || null,
        width_cm: body.width_cm ?? null,
        length_cm: body.length_cm ?? null,
        height_cm: body.height_cm ?? null,
        handle_model_id: body.handle_model_id || null,
        estimated_price: body.estimated_price ?? null,
      })
      .select()
      .single();
    if (quoteError || !quote) {
      throw quoteError ?? new Error("Não foi possível enviar o pedido de orçamento.");
    }

    // Notificação best-effort — o orçamento já ficou salvo mesmo se isso falhar.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-new-quote`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quoteId: quote.id }),
    }).catch(() => {});

    return new Response(JSON.stringify({ quote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Supabase Edge Function: guest-checkout-order
//
// Cria um pedido para um cliente sem conta (checkout de convidado, ver
// src/components/GuestCheckoutForm.tsx). Não exige sessão — um cliente 100%
// anônimo não pode inserir em customers/orders via RLS diretamente
// (auth_user_id = auth.uid() dá NULL quando ambos os lados são nulos), então
// esta função usa o service role para isso, igual ao resto das escritas
// privilegiadas do projeto. Nunca confia em preços/valores enviados pelo
// cliente: recalcula tudo a partir de products/shipping_methods.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_PAYMENT_METHODS = ["pix", "dinheiro", "a_combinar", "mercadopago"];

interface CustomerInput {
  full_name: string;
  email: string;
  phone: string;
  cpf_cnpj?: string | null;
  address_line1: string;
  address_line2?: string | null;
  address_number?: string | null;
  neighborhood?: string | null;
  postal_code: string;
  city: string;
  region?: string | null;
  country_code: string;
  marketing_opt_in?: boolean;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateCustomer(customer: CustomerInput | undefined): string | null {
  if (!customer) return "Os dados do cliente são obrigatórios.";
  if (!customer.full_name?.trim()) return "Informe seu nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email ?? "")) return "Email inválido.";
  if (!customer.phone?.trim()) return "Informe um telefone de contato.";
  if (!customer.address_line1?.trim()) return "Informe seu endereço.";
  if (!customer.address_number?.trim()) return "Informe o número.";
  if (!customer.neighborhood?.trim()) return "Informe o bairro.";
  if (!customer.postal_code?.trim()) return "Informe o CEP.";
  if (!customer.city?.trim()) return "Informe sua cidade.";
  if (!customer.country_code?.trim()) return "Informe seu país.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const draftCustomerId: string | null = body.draftCustomerId ?? null;
    const customerInput: CustomerInput | undefined = body.customer;
    const items: { product_id: string; quantity: number }[] = body.items ?? [];
    const shippingMethodId: string | undefined = body.shipping_method_id;
    const paymentMethod: string = body.payment_method;
    const engravingText: string | null = body.engraving_text || null;
    const engravingImageUrl: string | null = body.engraving_image_url || null;

    const customerError = validateCustomer(customerInput);
    if (customerError) return jsonError(customerError, 400);
    if (!Array.isArray(items) || items.length === 0) {
      return jsonError("O carrinho está vazio.", 400);
    }
    if (items.some((i) => !i.product_id || !Number.isInteger(i.quantity) || i.quantity < 1)) {
      return jsonError("Há itens inválidos no carrinho.", 400);
    }
    if (!shippingMethodId) return jsonError("Escolha um método de entrega.", 400);
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return jsonError("Forma de pagamento inválida.", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Recalcula tudo a partir do servidor — nunca confia em preços do cliente.
    const productIds = [...new Set(items.map((i) => i.product_id))];
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, active")
      .in("id", productIds);
    if (productsError) throw productsError;

    const productMap = new Map((products ?? []).map((p) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product || !product.active) {
        return jsonError("Algum produto do seu carrinho não está mais disponível.", 400);
      }
    }

    const { data: shippingMethod, error: shippingError } = await supabase
      .from("shipping_methods")
      .select("id, name, price, active")
      .eq("id", shippingMethodId)
      .maybeSingle();
    if (shippingError) throw shippingError;
    if (!shippingMethod || !shippingMethod.active) {
      return jsonError("Escolha um método de entrega válido.", 400);
    }

    const subtotal = items.reduce((sum, item) => {
      const product = productMap.get(item.product_id)!;
      return sum + product.price * item.quantity;
    }, 0);
    const total = subtotal + shippingMethod.price;

    const customerFields = {
      full_name: customerInput!.full_name,
      email: customerInput!.email,
      phone: customerInput!.phone,
      cpf_cnpj: customerInput!.cpf_cnpj || null,
      address_line1: customerInput!.address_line1,
      address_line2: customerInput!.address_line2 || null,
      address_number: customerInput!.address_number || null,
      neighborhood: customerInput!.neighborhood || null,
      postal_code: customerInput!.postal_code,
      city: customerInput!.city,
      region: customerInput!.region || null,
      country_code: customerInput!.country_code,
      marketing_opt_in: !!customerInput!.marketing_opt_in,
    };

    let customer: { id: string } | null = null;
    if (draftCustomerId) {
      const { data: updated, error: updateError } = await supabase
        .from("customers")
        .update(customerFields)
        .eq("id", draftCustomerId)
        .is("auth_user_id", null)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      customer = updated;
    }
    if (!customer) {
      const { data: inserted, error: insertError } = await supabase
        .from("customers")
        .insert({ ...customerFields, auth_user_id: null })
        .select("id")
        .single();
      if (insertError) throw insertError;
      customer = inserted;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customer.id,
        status: "pending",
        payment_method: paymentMethod,
        subtotal,
        shipping_method_id: shippingMethod.id,
        shipping_method_name: shippingMethod.name,
        shipping_cost: shippingMethod.price,
        total,
        shipping_full_name: customerFields.full_name,
        shipping_phone: customerFields.phone,
        shipping_address_line1: customerFields.address_line1,
        shipping_address_line2: customerFields.address_line2,
        shipping_address_number: customerFields.address_number,
        shipping_neighborhood: customerFields.neighborhood,
        shipping_postal_code: customerFields.postal_code,
        shipping_city: customerFields.city,
        shipping_region: customerFields.region,
        shipping_country_code: customerFields.country_code,
        engraving_text: engravingText,
        engraving_image_url: engravingImageUrl,
      })
      .select()
      .single();
    if (orderError || !order) throw orderError ?? new Error("Não foi possível criar o pedido.");

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => {
        const product = productMap.get(item.product_id)!;
        return {
          order_id: order.id,
          product_id: item.product_id,
          product_name: product.name,
          unit_price: product.price,
          quantity: item.quantity,
        };
      }),
    );
    if (itemsError) throw itemsError;

    // Notificação best-effort — o pedido já ficou salvo mesmo se isso falhar.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-order-status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: order.id, status: "pending", isNewOrder: true }),
    }).catch(() => {});

    return new Response(JSON.stringify({ order }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Supabase Edge Function: create-order
//
// Cria o pedido de um cliente LOGADO. Antes o navegador gravava o pedido
// direto (com totais calculados no cliente); agora o servidor recalcula tudo
// (faixas de preço, kits, adicionais e frete) igual ao checkout de convidado
// (guest-checkout-order), usando o endereço já cadastrado do cliente.
//
// Variáveis de ambiente (injetadas automaticamente pelo Supabase):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "jsr:@supabase/supabase-js@2";
import { priceOrder, PricingError, type OrderLineInput } from "../_shared/orderPricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_PAYMENT_METHODS = ["pix", "dinheiro", "a_combinar", "mercadopago"];

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonError("Faça login para continuar.", 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return jsonError("Sessão inválida. Entre novamente.", 401);

    const body = await req.json();
    const items: OrderLineInput[] = body.items ?? [];
    const addonIds: string[] = body.addon_ids ?? [];
    const shippingMethodId: string | undefined = body.shipping_method_id;
    const paymentMethod: string = body.payment_method;
    const engravingText: string | null = body.engraving_text || null;
    const engravingImageUrl: string | null = body.engraving_image_url || null;

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return jsonError("Forma de pagamento inválida.", 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer) return jsonError("Complete seu perfil antes de finalizar o pedido.", 400);

    const priced = await priceOrder(supabase, { items, addonIds, shippingMethodId });

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: customer.id,
        status: "pending",
        payment_method: paymentMethod,
        subtotal: priced.subtotal,
        shipping_method_id: priced.shipping.id,
        shipping_method_name: priced.shipping.name,
        shipping_cost: priced.shipping.price,
        total: priced.total,
        shipping_full_name: customer.full_name,
        shipping_phone: customer.phone,
        shipping_address_line1: customer.address_line1,
        shipping_address_line2: customer.address_line2,
        shipping_address_number: customer.address_number,
        shipping_neighborhood: customer.neighborhood,
        shipping_postal_code: customer.postal_code,
        shipping_city: customer.city,
        shipping_region: customer.region,
        shipping_country_code: customer.country_code,
        engraving_text: engravingText,
        engraving_image_url: engravingImageUrl,
      })
      .select()
      .single();
    if (orderError || !order) throw orderError ?? new Error("Não foi possível criar o pedido.");

    const { error: itemsError } = await supabase.from("order_items").insert(
      priced.lines.map((line) => ({ order_id: order.id, ...line })),
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
    if (err instanceof PricingError) return jsonError(err.message, 400);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

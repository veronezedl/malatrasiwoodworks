// Supabase Edge Function: create-mercadopago-preference
//
// Cria uma "preference" de pagamento no Mercado Pago (Checkout Pro) para um
// pedido já existente (ver src/lib/api/orders.ts → createMercadoPagoPreference,
// chamada depois de createOrder()/guest-checkout-order já ter criado o
// pedido com payment_method='mercadopago'). Devolve a URL pra onde o
// navegador deve redirecionar o cliente.
//
// Variáveis de ambiente necessárias (Project Settings → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas automaticamente pelo Supabase)
//   MERCADOPAGO_ACCESS_TOKEN   credencial (teste ou produção) do painel do Mercado Pago
//   SITE_URL                   ex: "https://malatrasi-woodworks.vercel.app"

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Pagamento online ainda não configurado." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "*, customer:customers(full_name, email, phone), order_items(product_name, unit_price, quantity)",
      )
      .eq("id", orderId)
      .single();
    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = (Deno.env.get("SITE_URL") ?? "https://malatrasi-woodworks.vercel.app").replace(/\/$/, "");
    const items = (order.order_items ?? []) as {
      product_name: string;
      unit_price: number;
      quantity: number;
    }[];

    const preferenceBody: Record<string, unknown> = {
      items: items.map((item) => ({
        title: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "BRL",
      })),
      payer: {
        name: order.customer.full_name,
        email: order.customer.email,
        phone: { number: order.customer.phone },
      },
      external_reference: order.id,
      back_urls: {
        success: `${siteUrl}/pedido-confirmado?status=approved`,
        failure: `${siteUrl}/pedido-confirmado?status=failure`,
        pending: `${siteUrl}/pedido-confirmado?status=pending`,
      },
      auto_return: "approved",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
    };

    // Frete some como valor do pedido total menos o subtotal dos itens, pra
    // não precisar adicionar um "item fantasma" quando for grátis (0).
    if (order.shipping_cost > 0) {
      (preferenceBody.items as unknown[]).push({
        title: order.shipping_method_name || "Entrega",
        quantity: 1,
        unit_price: order.shipping_cost,
        currency_id: "BRL",
      });
    }

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });

    if (!mpRes.ok) {
      const errorText = await mpRes.text();
      console.error("Erro ao criar preference no Mercado Pago:", errorText);
      return new Response(
        JSON.stringify({ error: "Não foi possível iniciar o pagamento online." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mpData = await mpRes.json();
    const initPoint = accessToken.startsWith("TEST-")
      ? mpData.sandbox_init_point
      : mpData.init_point;

    await supabase
      .from("orders")
      .update({ mp_preference_id: mpData.id })
      .eq("id", orderId);

    return new Response(JSON.stringify({ initPoint }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

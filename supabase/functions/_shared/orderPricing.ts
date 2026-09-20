// Cálculo de preço do pedido no servidor — nunca confia em valores enviados
// pelo cliente. A regra de faixas (unitPriceForQty) é a mesma de
// src/lib/pricing.ts: mantenha as duas iguais.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface PriceTier {
  min_qty: number;
  unit_price: number;
}

export interface OrderLineInput {
  product_id?: string;
  combo_id?: string;
  quantity: number;
  // Adicionais desta linha; o valor de cada um é multiplicado pela quantidade.
  addon_ids?: string[];
}

export interface PricedLine {
  product_id: string | null;
  combo_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface PricedOrder {
  lines: PricedLine[];
  subtotal: number;
  shipping: { id: string; name: string; price: number };
  total: number;
}

// Erro de validação do pedido (vira 400 com a mensagem para o cliente).
export class PricingError extends Error {}

const MAX_QUANTITY = 999;

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function unitPriceForQty(
  basePrice: number,
  tiers: PriceTier[] | null | undefined,
  qty: number,
): number {
  let best: PriceTier | null = null;
  for (const tier of tiers ?? []) {
    if (qty >= tier.min_qty && (!best || tier.min_qty > best.min_qty)) best = tier;
  }
  // A faixa nunca sobe o preço: vale o menor entre o base (que pode ser o
  // promocional) e o da faixa atingida.
  return round2(best ? Math.min(basePrice, best.unit_price) : basePrice);
}

export async function priceOrder(
  supabase: SupabaseClient,
  input: {
    items: OrderLineInput[];
    shippingMethodId?: string;
    // Estado (UF) do endereço de entrega e do CEP informado no carrinho — usados
    // pelo frete por peso e estado.
    deliveryUf?: string | null;
    cartUf?: string | null;
  },
): Promise<PricedOrder> {
  const { items } = input;

  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingError("O carrinho está vazio.");
  }
  for (const item of items) {
    const hasProduct = !!item.product_id;
    const hasCombo = !!item.combo_id;
    if (
      hasProduct === hasCombo ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > MAX_QUANTITY
    ) {
      throw new PricingError("Há itens inválidos no carrinho.");
    }
  }
  if (!input.shippingMethodId) throw new PricingError("Escolha um método de entrega.");

  const productItems = items.filter((i) => i.product_id);
  const comboItems = items.filter((i) => i.combo_id);
  const lines: PricedLine[] = [];
  // Peso total do carrinho (kg) para o frete por peso; itens sem peso invalidam o cálculo.
  let totalKg = 0;
  let weightUnknown = false;
  // Adicionais de cada linha, resolvidos depois de conhecermos o nome da linha.
  const lineAddons: { name: string; quantity: number; addonIds: string[] }[] = [];

  if (productItems.length > 0) {
    const ids = [...new Set(productItems.map((i) => i.product_id!))];
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, price, price_tiers, weight_kg, active")
      .in("id", ids);
    if (error) throw error;
    const map = new Map((products ?? []).map((p) => [p.id, p]));

    // Preço promocional da promoção ativa (e ainda não encerrada), por produto.
    const promoPrices = new Map<string, number>();
    const { data: promo, error: promoError } = await supabase
      .from("promotions")
      .select("id")
      .eq("active", true)
      .gt("ends_at", new Date().toISOString())
      .maybeSingle();
    if (promoError) throw promoError;
    if (promo) {
      const { data: promoItems, error: promoItemsError } = await supabase
        .from("promotion_products")
        .select("product_id, promo_price")
        .eq("promotion_id", promo.id)
        .in("product_id", ids);
      if (promoItemsError) throw promoItemsError;
      for (const row of promoItems ?? []) promoPrices.set(row.product_id, Number(row.promo_price));
    }

    for (const item of productItems) {
      const product = map.get(item.product_id!);
      if (!product || !product.active) {
        throw new PricingError("Algum produto do seu carrinho não está mais disponível.");
      }
      const basePrice = promoPrices.get(product.id) ?? product.price;
      if (product.weight_kg == null) weightUnknown = true;
      else totalKg += Number(product.weight_kg) * item.quantity;
      lines.push({
        product_id: product.id,
        combo_id: null,
        product_name: product.name,
        unit_price: unitPriceForQty(basePrice, product.price_tiers, item.quantity),
        quantity: item.quantity,
      });
      lineAddons.push({
        name: product.name,
        quantity: item.quantity,
        addonIds: [...new Set(item.addon_ids ?? [])],
      });
    }
  }

  if (comboItems.length > 0) {
    const ids = [...new Set(comboItems.map((i) => i.combo_id!))];
    const { data: combos, error } = await supabase
      .from("combos")
      .select("id, name, price, active, items:combo_items(quantity, product:products(name, weight_kg))")
      .in("id", ids);
    if (error) throw error;
    const map = new Map((combos ?? []).map((c) => [c.id, c]));
    for (const item of comboItems) {
      const combo = map.get(item.combo_id!);
      if (!combo || !combo.active) {
        throw new PricingError("Algum kit do seu carrinho não está mais disponível.");
      }
      type ComboProduct = { name: string; weight_kg: number | null };
      let comboKg = 0;
      const contents = (combo.items ?? [])
        .map((ci: { quantity: number; product: ComboProduct | ComboProduct[] | null }) => {
          const product = Array.isArray(ci.product) ? ci.product[0] : ci.product;
          if (!product || product.weight_kg == null) weightUnknown = true;
          else comboKg += Number(product.weight_kg) * ci.quantity;
          return product ? `${ci.quantity}x ${product.name}` : null;
        })
        .filter(Boolean)
        .join(", ");
      lines.push({
        product_id: null,
        combo_id: combo.id,
        product_name: contents ? `Kit: ${combo.name} (${contents})` : `Kit: ${combo.name}`,
        unit_price: round2(combo.price),
        quantity: item.quantity,
      });
      totalKg += comboKg * item.quantity;
      lineAddons.push({
        name: `Kit: ${combo.name}`,
        quantity: item.quantity,
        addonIds: [...new Set(item.addon_ids ?? [])],
      });
    }
  }

  const allAddonIds = [...new Set(lineAddons.flatMap((l) => l.addonIds))];
  if (allAddonIds.length > 0) {
    const { data: addons, error } = await supabase
      .from("addons")
      .select("id, name, price, active")
      .in("id", allAddonIds);
    if (error) throw error;
    const map = new Map((addons ?? []).map((a) => [a.id, a]));
    for (const line of lineAddons) {
      for (const id of line.addonIds) {
        const addon = map.get(id);
        if (!addon || !addon.active) {
          throw new PricingError("Algum adicional escolhido não está mais disponível.");
        }
        // Cobrado por unidade: quantidade do adicional = quantidade do item.
        lines.push({
          product_id: null,
          combo_id: null,
          product_name: `Adicional: ${addon.name} (${line.name})`,
          unit_price: round2(addon.price),
          quantity: line.quantity,
        });
      }
    }
  }

  const { data: shipping, error: shippingError } = await supabase
    .from("shipping_methods")
    .select("id, name, price, active, pricing_type")
    .eq("id", input.shippingMethodId)
    .maybeSingle();
  if (shippingError) throw shippingError;
  if (!shipping || !shipping.active) {
    throw new PricingError("Escolha um método de entrega válido.");
  }

  let shippingPrice = round2(shipping.price);
  let shippingName: string = shipping.name;
  if (shipping.pricing_type === "weight") {
    const deliveryUf = (input.deliveryUf ?? "").trim().toUpperCase();
    const cartUf = (input.cartUf ?? "").trim().toUpperCase();
    if (!deliveryUf) throw new PricingError("Informe o estado do endereço de entrega.");
    if (!cartUf) throw new PricingError("Informe o CEP de entrega no carrinho para calcular o frete.");
    if (cartUf !== deliveryUf) {
      throw new PricingError(
        `O CEP do carrinho é de ${cartUf}, mas o endereço de entrega é de ${deliveryUf}. Ajuste o CEP do carrinho ou o endereço.`,
      );
    }
    if (weightUnknown || totalKg <= 0) {
      throw new PricingError(
        "Não foi possível calcular o frete por peso: algum item está sem peso cadastrado.",
      );
    }
    const { data: rate, error: rateError } = await supabase
      .from("shipping_rates")
      .select("price_per_kg")
      .eq("uf", deliveryUf)
      .maybeSingle();
    if (rateError) throw rateError;
    if (!rate) throw new PricingError(`Ainda não entregamos em ${deliveryUf} pelo frete por peso.`);
    const kg = Math.round(totalKg * 1000) / 1000;
    shippingPrice = round2(Number(rate.price_per_kg) * kg);
    shippingName = `${shipping.name} — ${deliveryUf}, ${String(kg).replace(".", ",")} kg`;
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0));
  return {
    lines,
    subtotal,
    shipping: { id: shipping.id, name: shippingName, price: shippingPrice },
    total: round2(subtotal + shippingPrice),
  };
}

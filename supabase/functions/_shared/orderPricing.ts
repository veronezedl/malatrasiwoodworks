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
  return round2(best ? best.unit_price : basePrice);
}

export async function priceOrder(
  supabase: SupabaseClient,
  input: {
    items: OrderLineInput[];
    shippingMethodId?: string;
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
  // Adicionais de cada linha, resolvidos depois de conhecermos o nome da linha.
  const lineAddons: { name: string; quantity: number; addonIds: string[] }[] = [];

  if (productItems.length > 0) {
    const ids = [...new Set(productItems.map((i) => i.product_id!))];
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, price, price_tiers, active")
      .in("id", ids);
    if (error) throw error;
    const map = new Map((products ?? []).map((p) => [p.id, p]));
    for (const item of productItems) {
      const product = map.get(item.product_id!);
      if (!product || !product.active) {
        throw new PricingError("Algum produto do seu carrinho não está mais disponível.");
      }
      lines.push({
        product_id: product.id,
        combo_id: null,
        product_name: product.name,
        unit_price: unitPriceForQty(product.price, product.price_tiers, item.quantity),
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
      .select("id, name, price, active, items:combo_items(quantity, product:products(name))")
      .in("id", ids);
    if (error) throw error;
    const map = new Map((combos ?? []).map((c) => [c.id, c]));
    for (const item of comboItems) {
      const combo = map.get(item.combo_id!);
      if (!combo || !combo.active) {
        throw new PricingError("Algum kit do seu carrinho não está mais disponível.");
      }
      const contents = (combo.items ?? [])
        .map((ci: { quantity: number; product: { name: string } | { name: string }[] | null }) => {
          const product = Array.isArray(ci.product) ? ci.product[0] : ci.product;
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
    .select("id, name, price, active")
    .eq("id", input.shippingMethodId)
    .maybeSingle();
  if (shippingError) throw shippingError;
  if (!shipping || !shipping.active) {
    throw new PricingError("Escolha um método de entrega válido.");
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0));
  return {
    lines,
    subtotal,
    shipping: { id: shipping.id, name: shipping.name, price: round2(shipping.price) },
    total: round2(subtotal + shipping.price),
  };
}

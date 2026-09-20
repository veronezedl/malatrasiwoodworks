import type { PriceTier } from "@/types/database";

// Calculadora de orçamento sob medida (/orcamento). O valor é sempre uma
// ESTIMATIVA — o admin confirma (ou ajusta) o preço final ao responder o
// pedido de orçamento, então estes números não precisam ser perfeitos, só
// dar ao cliente uma ideia realista antes de falar com a loja.
//
// Ajuste livremente os valores abaixo conforme a realidade de custo da
// marcenaria (madeira, mão de obra, acabamento).

export interface ProductTypeConfig {
  value: string;
  label: string;
  // Preço de referência por m² de área (largura × comprimento), em R$.
  pricePerM2: number;
  // Valor mínimo da peça, para itens pequenos onde a conta por m² ficaria
  // abaixo do que compensa produzir.
  minPrice: number;
}

export const PRODUCT_TYPES: ProductTypeConfig[] = [
  { value: "tabua", label: "Tábua de corte", pricePerM2: 900, minPrice: 120 },
  { value: "mesa", label: "Mesa", pricePerM2: 1800, minPrice: 900 },
  { value: "banco", label: "Banco / assento", pricePerM2: 1500, minPrice: 400 },
  { value: "aparador", label: "Aparador / estante", pricePerM2: 1700, minPrice: 500 },
  { value: "luminaria", label: "Luminária", pricePerM2: 2200, minPrice: 180 },
  { value: "outro", label: "Outro", pricePerM2: 1400, minPrice: 200 },
];

export interface EstimateInput {
  productType: string;
  widthCm: number;
  lengthCm: number;
  heightCm?: number | null;
  // Sobretaxa do modelo de alça/cabo escolhido (0 quando nenhum foi
  // selecionado). Cadastrada pelo admin em handle_models.price_surcharge.
  handleSurcharge?: number;
}

export interface EstimateResult {
  areaM2: number;
  estimatedPrice: number;
}

export function getProductTypeConfig(value: string): ProductTypeConfig {
  return PRODUCT_TYPES.find((p) => p.value === value) ?? PRODUCT_TYPES[PRODUCT_TYPES.length - 1];
}

export function calculateEstimate(input: EstimateInput): EstimateResult | null {
  const { widthCm, lengthCm } = input;
  if (!widthCm || !lengthCm || widthCm <= 0 || lengthCm <= 0) return null;

  const areaM2 = (widthCm / 100) * (lengthCm / 100);
  const config = getProductTypeConfig(input.productType);

  let price = areaM2 * config.pricePerM2 + (input.handleSurcharge ?? 0);
  price = Math.max(price, config.minPrice);

  return {
    areaM2: Math.round(areaM2 * 10000) / 10000,
    estimatedPrice: Math.round(price * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Preço progressivo (faixas por produto). A mesma regra roda no servidor em
// supabase/functions/_shared/orderPricing.ts — mantenha as duas iguais.
// ---------------------------------------------------------------------------

export function activeTier(
  tiers: PriceTier[] | undefined,
  qty: number,
): PriceTier | null {
  let best: PriceTier | null = null;
  for (const tier of tiers ?? []) {
    if (qty >= tier.min_qty && (!best || tier.min_qty > best.min_qty)) best = tier;
  }
  return best;
}

export function nextTier(
  tiers: PriceTier[] | undefined,
  qty: number,
): PriceTier | null {
  let next: PriceTier | null = null;
  for (const tier of tiers ?? []) {
    if (tier.min_qty > qty && (!next || tier.min_qty < next.min_qty)) next = tier;
  }
  return next;
}

export function unitPriceForQty(
  basePrice: number,
  tiers: PriceTier[] | undefined,
  qty: number,
): number {
  const tier = activeTier(tiers, qty);
  return Math.round((tier ? tier.unit_price : basePrice) * 100) / 100;
}

export function lowestTier(tiers: PriceTier[] | undefined): PriceTier | null {
  let low: PriceTier | null = null;
  for (const tier of tiers ?? []) {
    if (!low || tier.unit_price < low.unit_price) low = tier;
  }
  return low;
}

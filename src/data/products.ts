// Categorias hoje são cadastradas pelo admin (tabela public.categories, ver
// src/lib/api/categories.ts) em vez de uma lista fixa aqui — "Todos" é o
// único valor especial reservado, usado como opção "sem filtro" no
// &lt;CategoryFilter&gt;.
export const ALL_CATEGORIES_FILTER = "Todos";
// Filtro especial: só os produtos da promoção ativa.
export const PROMO_FILTER = "Promoção";
export type FilterCategory = string;

import type { PriceTier } from "@/types/database";

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  // Preço da promoção ativa para este produto (null fora de promoção).
  promoPrice: number | null;
  priceTiers: PriceTier[];
  images: string[];
  description: string;
  woodType: string | null;
  widthCm: number | null;
  heightCm: number | null;
  weightKg: number | null;
  isCustomOrder: boolean;
  featured: boolean;
}

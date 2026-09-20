// Categorias hoje são cadastradas pelo admin (tabela public.categories, ver
// src/lib/api/categories.ts) em vez de uma lista fixa aqui — "Todos" é o
// único valor especial reservado, usado como opção "sem filtro" no
// &lt;CategoryFilter&gt;.
export const ALL_CATEGORIES_FILTER = "Todos";
export type FilterCategory = string;

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  images: string[];
  description: string;
  woodType: string | null;
  isCustomOrder: boolean;
  featured: boolean;
}

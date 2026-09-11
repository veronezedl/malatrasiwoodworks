export type StoreCategory =
  | "Mesas"
  | "Bancos e Assentos"
  | "Utilidades"
  | "Iluminação"
  | "Sob Encomenda";

export type FilterCategory = "Todos" | StoreCategory;

export const FILTER_CATEGORIES: FilterCategory[] = [
  "Todos",
  "Mesas",
  "Bancos e Assentos",
  "Utilidades",
  "Iluminação",
  "Sob Encomenda",
];

export const CATEGORY_TO_FILTER: Record<StoreCategory, FilterCategory> = {
  Mesas: "Mesas",
  "Bancos e Assentos": "Bancos e Assentos",
  Utilidades: "Utilidades",
  Iluminação: "Iluminação",
  "Sob Encomenda": "Sob Encomenda",
};

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: StoreCategory;
  price: number;
  image: string;
  description: string;
  woodType: string | null;
  isCustomOrder: boolean;
  featured: boolean;
}

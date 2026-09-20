import { supabase } from "@/lib/supabase";
import type { Product } from "@/data/products";
import type { ProductWithCategory } from "@/types/database";

const PRODUCT_SELECT = "*, category:categories(name)";

function toProduct(row: ProductWithCategory): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category?.name ?? "Sem categoria",
    price: row.price,
    priceTiers: row.price_tiers ?? [],
    images: [row.image_url, row.image_url_2].filter(
      (url): url is string => !!url,
    ),
    description: row.description,
    woodType: row.wood_type,
    isCustomOrder: row.is_custom_order,
    featured: row.featured,
  };
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("visible_in_store", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as ProductWithCategory[]).map(toProduct);
}

// Usado tanto pela página de produto (/produto/:slug) quanto pelo "adicionar
// via link externo" do carrinho (?add=slug, ver Carrito.tsx) — um produto
// oculto da loja deve se comportar como inexistente em ambos.
export async function fetchProductBySlug(
  slug: string,
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("active", true)
    .eq("visible_in_store", true)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as unknown as ProductWithCategory) : null;
}

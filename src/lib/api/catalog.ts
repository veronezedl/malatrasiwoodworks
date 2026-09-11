import { supabase } from "@/lib/supabase";
import type { Product, StoreCategory } from "@/data/products";
import type { DbProduct } from "@/types/database";

function toProduct(row: DbProduct): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as StoreCategory,
    price: row.price,
    image: row.image_url,
    description: row.description,
    woodType: row.wood_type,
    isCustomOrder: row.is_custom_order,
    featured: row.featured,
  };
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .eq("visible_in_store", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toProduct);
}

// Usado tanto pela página de produto (/produto/:slug) quanto pelo "adicionar
// via link externo" do carrinho (?add=slug, ver Carrito.tsx) — um produto
// oculto da loja deve se comportar como inexistente em ambos.
export async function fetchProductBySlug(
  slug: string,
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .eq("visible_in_store", true)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data) : null;
}

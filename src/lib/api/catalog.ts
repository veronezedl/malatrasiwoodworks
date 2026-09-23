import { supabase } from "@/lib/supabase";
import type { Product } from "@/data/products";
import type { ProductWithCategory } from "@/types/database";
import { fetchPromoPrices } from "@/lib/api/promotions";

const PRODUCT_SELECT = "*, category:categories(name)";

// Agrupa por categoria (nome) e, dentro dela, pela ordem manual do admin —
// ver AdminProductOrder. Feito no cliente porque o PostgREST não reordena a
// lista principal por uma coluna de uma tabela relacionada (o parâmetro
// `referencedTable`/`foreignTable` do supabase-js só ordena o objeto
// embutido, não as linhas retornadas).
function sortByCategoryThenOrder(rows: ProductWithCategory[]): ProductWithCategory[] {
  return [...rows].sort((a, b) => {
    const categoryCompare = (a.category?.name ?? "").localeCompare(
      b.category?.name ?? "",
      "pt-BR",
    );
    if (categoryCompare !== 0) return categoryCompare;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return b.created_at.localeCompare(a.created_at);
  });
}

function toProduct(
  row: ProductWithCategory,
  promoPrices: Map<string, number>,
): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category?.name ?? "Sem categoria",
    price: row.price,
    promoPrice: promoPrices.get(row.id) ?? null,
    priceTiers: row.price_tiers ?? [],
    images: [row.image_url, row.image_url_2].filter(
      (url): url is string => !!url,
    ),
    description: row.description,
    woodType: row.wood_type,
    widthCm: row.width_cm ?? null,
    heightCm: row.height_cm ?? null,
    weightKg: row.weight_kg ?? null,
    isCustomOrder: row.is_custom_order,
    featured: row.featured,
  };
}

export async function fetchActiveProducts(): Promise<Product[]> {
  const [{ data, error }, promoPrices] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("active", true)
      .eq("visible_in_store", true),
    // Best-effort: se a promoção não carregar, o catálogo segue sem ela.
    fetchPromoPrices().catch(() => new Map<string, number>()),
  ]);
  if (error) throw error;
  const rows = sortByCategoryThenOrder((data ?? []) as unknown as ProductWithCategory[]);
  return rows.map((row) => toProduct(row, promoPrices));
}

// Usado tanto pela página de produto (/produto/:slug) quanto pelo "adicionar
// via link externo" do carrinho (?add=slug, ver Carrito.tsx) — um produto
// oculto da loja deve se comportar como inexistente em ambos.
export async function fetchProductBySlug(
  slug: string,
): Promise<Product | null> {
  const [{ data, error }, promoPrices] = await Promise.all([
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .eq("active", true)
      .eq("visible_in_store", true)
      .maybeSingle(),
    fetchPromoPrices().catch(() => new Map<string, number>()),
  ]);
  if (error) throw error;
  return data ? toProduct(data as unknown as ProductWithCategory, promoPrices) : null;
}

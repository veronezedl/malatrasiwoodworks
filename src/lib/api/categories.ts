import { supabase } from "@/lib/supabase";
import type { DbCategory } from "@/types/database";

export async function listCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    // Ordem manual primeiro; nome como desempate (categorias novas, ainda
    // sem posição definida, ficam em ordem alfabética entre si).
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActiveCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// sort_order é opcional: sem ele, o banco usa o padrão (categoria nova entra
// no fim) — a posição exata é ajustada depois na tela de categorias.
export type CategoryInput = Omit<
  DbCategory,
  "id" | "created_at" | "updated_at" | "sort_order"
> & {
  sort_order?: number;
};

export async function createCategory(input: CategoryInput): Promise<void> {
  const { error } = await supabase.from("categories").insert(input);
  if (error) throw error;
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>,
): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

// Troca a posição de duas categorias (setas na tela de admin).
export async function swapCategoryOrder(
  a: Pick<DbCategory, "id" | "sort_order">,
  b: Pick<DbCategory, "id" | "sort_order">,
): Promise<void> {
  await updateCategory(a.id, { sort_order: b.sort_order });
  await updateCategory(b.id, { sort_order: a.sort_order });
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

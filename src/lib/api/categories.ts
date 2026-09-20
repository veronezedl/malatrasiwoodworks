import { supabase } from "@/lib/supabase";
import type { DbCategory } from "@/types/database";

export async function listCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActiveCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type CategoryInput = Omit<DbCategory, "id" | "created_at" | "updated_at">;

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

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

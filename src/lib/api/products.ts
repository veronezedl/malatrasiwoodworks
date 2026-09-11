import { supabase } from "@/lib/supabase";
import type { DbProduct } from "@/types/database";

export async function listProducts(): Promise<DbProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("products")
    .upload(path, file, { cacheControl: "3600" });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("products").getPublicUrl(path);
  return data.publicUrl;
}

export type ProductInput = Omit<DbProduct, "id" | "created_at" | "updated_at">;

export async function createProduct(input: ProductInput): Promise<DbProduct> {
  const { data, error } = await supabase
    .from("products")
    .insert(input)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Não foi possível criar o produto.");
  return data;
}

export async function updateProduct(
  id: string,
  input: Partial<ProductInput>,
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export interface BulkProductInput {
  // Linha original (base 1, contando o cabeçalho) — só para reportar
  // erros na mesma ordem que o usuário vê no CSV.
  row: number;
  input: ProductInput;
}

export interface BulkImportResult {
  created: number;
  errors: { row: number; name: string; message: string }[];
}

// Insere linha por linha (não em um único insert em massa) para que um slug
// duplicado ou um erro pontual não derrube o resto do lote — cada linha do
// CSV roda ou falha de forma independente e é reportada separadamente.
export async function bulkCreateProducts(
  items: BulkProductInput[],
): Promise<BulkImportResult> {
  const result: BulkImportResult = { created: 0, errors: [] };
  for (const item of items) {
    try {
      await createProduct(item.input);
      result.created++;
    } catch (err) {
      result.errors.push({
        row: item.row,
        name: item.input.name,
        message: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }
  return result;
}

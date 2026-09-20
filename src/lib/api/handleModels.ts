import { supabase } from "@/lib/supabase";
import type { DbHandleModel } from "@/types/database";

export async function listHandleModels(): Promise<DbHandleModel[]> {
  const { data, error } = await supabase
    .from("handle_models")
    .select("*")
    .order("price_surcharge", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActiveHandleModels(): Promise<DbHandleModel[]> {
  const { data, error } = await supabase
    .from("handle_models")
    .select("*")
    .eq("active", true)
    .order("price_surcharge", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type HandleModelInput = Omit<
  DbHandleModel,
  "id" | "created_at" | "updated_at"
>;

export async function createHandleModel(input: HandleModelInput): Promise<void> {
  const { error } = await supabase.from("handle_models").insert(input);
  if (error) throw error;
}

export async function updateHandleModel(
  id: string,
  input: Partial<HandleModelInput>,
): Promise<void> {
  const { error } = await supabase
    .from("handle_models")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHandleModel(id: string): Promise<void> {
  const { error } = await supabase.from("handle_models").delete().eq("id", id);
  if (error) throw error;
}

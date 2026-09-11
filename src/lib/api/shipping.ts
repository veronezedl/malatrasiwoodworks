import { supabase } from "@/lib/supabase";
import type { DbShippingMethod } from "@/types/database";

export async function listShippingMethods(): Promise<DbShippingMethod[]> {
  const { data, error } = await supabase
    .from("shipping_methods")
    .select("*")
    .order("price", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActiveShippingMethods(): Promise<DbShippingMethod[]> {
  const { data, error } = await supabase
    .from("shipping_methods")
    .select("*")
    .eq("active", true)
    .eq("visible_in_store", true)
    .order("price", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type ShippingMethodInput = Omit<
  DbShippingMethod,
  "id" | "created_at" | "updated_at"
>;

export async function createShippingMethod(
  input: ShippingMethodInput,
): Promise<void> {
  const { error } = await supabase.from("shipping_methods").insert(input);
  if (error) throw error;
}

export async function updateShippingMethod(
  id: string,
  input: Partial<ShippingMethodInput>,
): Promise<void> {
  const { error } = await supabase
    .from("shipping_methods")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteShippingMethod(id: string): Promise<void> {
  const { error } = await supabase.from("shipping_methods").delete().eq("id", id);
  if (error) throw error;
}

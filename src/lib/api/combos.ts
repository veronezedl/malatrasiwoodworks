import { supabase } from "@/lib/supabase";
import type { ComboWithItems } from "@/types/database";

const COMBO_SELECT = "*, items:combo_items(*, product:products(name, price, weight_kg))";

export async function listCombos(): Promise<ComboWithItems[]> {
  const { data, error } = await supabase
    .from("combos")
    .select(COMBO_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ComboWithItems[];
}

export async function listActiveCombos(): Promise<ComboWithItems[]> {
  const { data, error } = await supabase
    .from("combos")
    .select(COMBO_SELECT)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ComboWithItems[];
}

export interface ComboInput {
  name: string;
  description: string;
  image_url: string | null;
  price: number;
  active: boolean;
  items: { product_id: string; quantity: number }[];
}

async function replaceItems(
  comboId: string,
  items: ComboInput["items"],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("combo_items")
    .delete()
    .eq("combo_id", comboId);
  if (deleteError) throw deleteError;
  if (items.length === 0) return;
  const { error } = await supabase.from("combo_items").insert(
    items.map((item) => ({ combo_id: comboId, ...item })),
  );
  if (error) throw error;
}

export async function createCombo(input: ComboInput): Promise<void> {
  const { items, ...fields } = input;
  const { data, error } = await supabase
    .from("combos")
    .insert(fields)
    .select("id")
    .single();
  if (error) throw error;
  await replaceItems(data.id, items);
}

export async function updateCombo(id: string, input: ComboInput): Promise<void> {
  const { items, ...fields } = input;
  const { error } = await supabase.from("combos").update(fields).eq("id", id);
  if (error) throw error;
  await replaceItems(id, items);
}

export async function deleteCombo(id: string): Promise<void> {
  const { error } = await supabase.from("combos").delete().eq("id", id);
  if (error) throw error;
}

import { supabase } from "@/lib/supabase";
import type { DbAddon } from "@/types/database";

export async function listAddons(): Promise<DbAddon[]> {
  const { data, error } = await supabase
    .from("addons")
    .select("*")
    .order("price", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActiveAddons(): Promise<DbAddon[]> {
  const { data, error } = await supabase
    .from("addons")
    .select("*")
    .eq("active", true)
    .order("price", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type AddonInput = Omit<DbAddon, "id" | "created_at" | "updated_at">;

export async function createAddon(input: AddonInput): Promise<void> {
  const { error } = await supabase.from("addons").insert(input);
  if (error) throw error;
}

export async function updateAddon(
  id: string,
  input: Partial<AddonInput>,
): Promise<void> {
  const { error } = await supabase.from("addons").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteAddon(id: string): Promise<void> {
  const { error } = await supabase.from("addons").delete().eq("id", id);
  if (error) throw error;
}

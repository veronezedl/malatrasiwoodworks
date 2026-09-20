import { supabase } from "@/lib/supabase";
import type { DbHeroBanner } from "@/types/database";

export async function listHeroBanners(): Promise<DbHeroBanner[]> {
  const { data, error } = await supabase
    .from("hero_banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActiveHeroBanners(): Promise<DbHeroBanner[]> {
  const { data, error } = await supabase
    .from("hero_banners")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createHeroBanner(
  imageUrl: string,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from("hero_banners")
    .insert({ image_url: imageUrl, sort_order: sortOrder, active: true });
  if (error) throw error;
}

export async function updateHeroBanner(
  id: string,
  input: Partial<Pick<DbHeroBanner, "active" | "sort_order" | "image_url">>,
): Promise<void> {
  const { error } = await supabase.from("hero_banners").update(input).eq("id", id);
  if (error) throw error;
}

// Troca a posição de dois banners (subir/descer na ordem de exibição).
export async function swapHeroBannerOrder(
  a: DbHeroBanner,
  b: DbHeroBanner,
): Promise<void> {
  await updateHeroBanner(a.id, { sort_order: b.sort_order });
  await updateHeroBanner(b.id, { sort_order: a.sort_order });
}

export async function deleteHeroBanner(id: string): Promise<void> {
  const { error } = await supabase.from("hero_banners").delete().eq("id", id);
  if (error) throw error;
}

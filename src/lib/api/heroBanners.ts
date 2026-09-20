import { supabase } from "@/lib/supabase";
import type { DbHeroBanner, DbHeroSettings } from "@/types/database";

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

export const DEFAULT_HERO_SETTINGS = { interval_seconds: 5, opacity: 100 };

export type HeroSettingsInput = Pick<DbHeroSettings, "interval_seconds" | "opacity">;

export async function getHeroSettings(): Promise<HeroSettingsInput> {
  const { data, error } = await supabase
    .from("hero_settings")
    .select("interval_seconds, opacity")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return data ?? DEFAULT_HERO_SETTINGS;
}

export async function saveHeroSettings(input: HeroSettingsInput): Promise<void> {
  const { error } = await supabase
    .from("hero_settings")
    .upsert({ id: 1, ...input });
  if (error) throw error;
}

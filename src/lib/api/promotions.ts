import { supabase } from "@/lib/supabase";

export interface DbPromotion {
  id: string;
  message: string;
  ends_at: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type PromotionInput = Omit<
  DbPromotion,
  "id" | "created_at" | "updated_at"
>;

export async function listPromotions(): Promise<DbPromotion[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPromotion(
  input: PromotionInput,
): Promise<DbPromotion> {
  const { data, error } = await supabase
    .from("promotions")
    .insert(input)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Não foi possível criar a promoção.");
  return data;
}

export async function updatePromotion(
  id: string,
  input: Partial<PromotionInput>,
): Promise<void> {
  const { error } = await supabase.from("promotions").update(input).eq("id", id);
  if (error) throw error;
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from("promotions").delete().eq("id", id);
  if (error) throw error;
}

// Desativa todas antes de ativar a escolhida — evita conflito com o índice
// único parcial que garante no máximo uma promoção ativa por vez.
export async function setActivePromotion(
  id: string,
  active: boolean,
): Promise<void> {
  if (active) {
    const { error: deactivateError } = await supabase
      .from("promotions")
      .update({ active: false })
      .eq("active", true);
    if (deactivateError) throw deactivateError;
  }
  const { error } = await supabase
    .from("promotions")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

// Leitura pública (sem auth) para o banner da loja.
export async function getActivePromotion(): Promise<DbPromotion | null> {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("active", true)
    .gt("ends_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return data;
}

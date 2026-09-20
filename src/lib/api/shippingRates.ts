import { supabase } from "@/lib/supabase";
import type { DbShippingRate } from "@/types/database";

export async function listShippingRates(): Promise<DbShippingRate[]> {
  const { data, error } = await supabase
    .from("shipping_rates")
    .select("*")
    .order("uf", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Grava a tabela inteira: estados com valor são gravados (upsert) e os que
// ficaram sem valor são removidos (= estado não atendido).
export async function saveShippingRates(
  rates: { uf: string; price_per_kg: number }[],
): Promise<void> {
  if (rates.length > 0) {
    const { error } = await supabase.from("shipping_rates").upsert(rates);
    if (error) throw error;
  }
  const keep = rates.map((r) => r.uf);
  const query = supabase.from("shipping_rates").delete();
  const { error } =
    keep.length > 0
      ? await query.not("uf", "in", `(${keep.join(",")})`)
      : await query.neq("uf", "");
  if (error) throw error;
}

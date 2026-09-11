import { supabase } from "@/lib/supabase";
import type { DbCustomer } from "@/types/database";

export async function listCustomers(): Promise<DbCustomer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCustomer(id: string): Promise<DbCustomer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMyCustomer(
  authUserId: string,
): Promise<DbCustomer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyCustomer(
  customerId: string,
  updates: Partial<
    Pick<
      DbCustomer,
      | "full_name"
      | "phone"
      | "cpf_cnpj"
      | "address_line1"
      | "address_line2"
      | "postal_code"
      | "city"
      | "region"
      | "country_code"
      | "avatar_url"
    >
  >,
): Promise<DbCustomer> {
  const { data, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", customerId)
    .select()
    .single();
  if (error || !data) throw error ?? new Error("Não foi possível atualizar o perfil.");
  return data;
}

export async function uploadAvatar(authUserId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${authUserId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

// Admin: convida um cliente "pré-cadastro" (checkout de convidado, sem
// conta) a criar sua senha.
export async function inviteCustomerToRegister(customerId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("invite-customer", {
    body: { customerId },
  });
  if (error) throw error;
}

// Vincula, se existir, um registro "pré-cadastro" (mesmo email, sem conta
// ainda) ao usuário recém-autenticado. Best-effort: no-op silencioso se não
// houver nada para reivindicar (caso normal de um reset de senha).
export async function claimGuestCustomer(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("claim-guest-customer");
  if (error) return false;
  return Boolean((data as { claimed?: boolean } | null)?.claimed);
}

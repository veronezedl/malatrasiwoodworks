import { supabase } from "@/lib/supabase";

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_self: boolean;
  is_banned: boolean;
}

async function invokeOrThrow<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    let detailedMessage: string | null = null;
    if (context) {
      try {
        const responseBody = await context.clone().json();
        detailedMessage = responseBody?.error ?? null;
      } catch {
        // Se não for possível ler o context, cai na mensagem genérica abaixo.
      }
    }
    throw new Error(detailedMessage ?? error.message);
  }
  return data as T;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const data = await invokeOrThrow<{ admins: AdminUser[] }>("list-admin-users", {});
  return data.admins;
}

export async function inviteAdmin(
  email: string,
): Promise<{ promoted: boolean; notified: boolean }> {
  return invokeOrThrow("invite-admin", { email });
}

export async function revokeAdmin(userId: string): Promise<void> {
  await invokeOrThrow("revoke-admin", { userId });
}

export async function setUserBan(userId: string, banned: boolean): Promise<void> {
  await invokeOrThrow("set-user-ban", { userId, banned });
}

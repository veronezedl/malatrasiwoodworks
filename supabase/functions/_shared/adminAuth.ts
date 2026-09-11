// Checagem de auth compartilhada pelas edge functions administrativas
// (convidar/revogar admin, banir usuário, listar admins) — só admins podem
// disparar essas ações.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; message: string; status: number };

export async function requireAdmin(
  supabase: SupabaseClient,
  req: Request,
): Promise<AdminAuthResult> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return { ok: false, message: "Não autenticado (falta o token de sessão).", status: 401 };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return { ok: false, message: "Não autenticado (sessão inválida ou expirada).", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return { ok: false, message: "Não autorizado (o usuário não é admin).", status: 403 };
  }

  return { ok: true, userId: userData.user.id };
}

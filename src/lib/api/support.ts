import { supabase } from "@/lib/supabase";
import type { DbSupportRequest } from "@/types/database";

async function notifySupportRequest(requestId: string) {
  try {
    await supabase.functions.invoke("notify-support-request", {
      body: { requestId },
    });
  } catch {
    // A notificação é best-effort; a solicitação já ficou salva.
  }
}

export async function listMySupportRequests(): Promise<DbSupportRequest[]> {
  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSupportRequest(params: {
  customerId: string;
  subject: string;
  message: string;
  orderId?: string | null;
}): Promise<DbSupportRequest> {
  const { data, error } = await supabase
    .from("support_requests")
    .insert({
      customer_id: params.customerId,
      order_id: params.orderId ?? null,
      subject: params.subject,
      message: params.message,
    })
    .select()
    .single();
  if (error || !data)
    throw error ?? new Error("Não foi possível enviar a solicitação.");

  await notifySupportRequest(data.id);
  return data;
}

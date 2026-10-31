// Notificações para o dono da loja: grava na central de notificações do
// painel (admin_notifications) e manda push (Web Push) para cada celular ou
// navegador em que um admin ativou as notificações (push_subscriptions,
// ver src/pages/admin/AdminNotifications.tsx).
//
// Variáveis de ambiente (Project Settings → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  par gerado com `npx web-push generate-vapid-keys`
//   VAPID_SUBJECT                        opcional, ex: "mailto:malatrasiww@gmail.com"
// Sem as chaves VAPID a notificação ainda aparece na central do painel, só
// não chega no celular.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

export type AdminNotificationType = "new_order" | "payment_approved";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
}

interface OrderSummary {
  id: string;
  order_number: string;
  total: number;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

let vapidConfigured: boolean | null = null;

function configureVapid(): boolean {
  if (vapidConfigured !== null) return vapidConfigured;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) {
    vapidConfigured = false;
    return false;
  }
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") || "mailto:malatrasiww@gmail.com",
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
  return true;
}

// Manda o push para os aparelhos inscritos (de todos os admins ou só de um
// usuário). Inscrições que o navegador já descartou (404/410) são apagadas.
// Devolve quantos aparelhos receberam.
export async function sendPushToAdmins(
  supabase: SupabaseClient,
  payload: PushPayload,
  onlyUserId?: string,
): Promise<number> {
  if (!configureVapid()) return 0;

  let query = supabase.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth");
  if (onlyUserId) query = query.eq("user_id", onlyUserId);
  const { data: subscriptions, error } = await query;
  if (error) throw error;
  if (!subscriptions?.length) return 0;

  // Só quem ainda é admin — um admin revogado deixa de receber mesmo que o
  // aparelho continue inscrito.
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .in("id", [...new Set(subscriptions.map((s) => s.user_id))]);
  const adminIds = new Set((admins ?? []).map((a) => a.id));

  const message = JSON.stringify(payload);
  const expiredIds: string[] = [];
  let delivered = 0;

  await Promise.all(
    subscriptions
      .filter((s) => adminIds.has(s.user_id))
      .map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            message,
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
          delivered++;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            expiredIds.push(s.id);
          } else {
            console.error("Falha ao enviar push:", statusCode, (err as Error).message);
          }
        }
      }),
  );

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }
  return delivered;
}

async function notifyAdmins(
  supabase: SupabaseClient,
  type: AdminNotificationType,
  order: OrderSummary,
  title: string,
  body: string,
) {
  const url = `/admin/pedidos/${order.id}`;
  const { error } = await supabase.from("admin_notifications").insert({
    type,
    title,
    body,
    url,
    order_id: order.id,
  });
  if (error) console.error("Erro ao gravar notificação do admin:", error.message);

  await sendPushToAdmins(supabase, { title, body, url, tag: `${type}-${order.id}` });
}

// Best-effort: nunca derruba o fluxo que chamou (pedido/webhook já estão
// gravados). Usa EdgeRuntime.waitUntil quando disponível pra não atrasar a
// resposta ao cliente enquanto os pushes são enviados.
function runInBackground(task: Promise<unknown>): Promise<void> {
  const safe = task.then(
    () => {},
    (err) => console.error("Erro ao notificar admins:", err),
  );
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime;
  if (runtime) {
    runtime.waitUntil(safe);
    return Promise.resolve();
  }
  return safe;
}

export function notifyNewOrder(
  supabase: SupabaseClient,
  order: OrderSummary,
  customerName: string,
): Promise<void> {
  return runInBackground(
    notifyAdmins(
      supabase,
      "new_order",
      order,
      `🛒 Novo pedido ${order.order_number}`,
      `${customerName} · ${brl.format(order.total)} · aguardando pagamento`,
    ),
  );
}

export function notifyPaymentApproved(
  supabase: SupabaseClient,
  order: OrderSummary,
  customerName: string,
): Promise<void> {
  return runInBackground(
    notifyAdmins(
      supabase,
      "payment_approved",
      order,
      `💰 Venda confirmada ${order.order_number}`,
      `${customerName} pagou ${brl.format(order.total)} pelo Mercado Pago`,
    ),
  );
}

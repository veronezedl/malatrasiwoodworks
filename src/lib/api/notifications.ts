import { supabase } from "@/lib/supabase";
import type { DbAdminNotification } from "@/types/database";

// Central de notificações do painel (admin_notifications) e inscrição deste
// aparelho no push (push_subscriptions). As notificações são criadas pelas
// edge functions — ver supabase/functions/_shared/adminNotifications.ts.

export async function listAdminNotifications(limit = 50): Promise<DbAdminNotification[]> {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countUnreadAdminNotifications(): Promise<number> {
  const { count, error } = await supabase
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

async function invokeAdminPush<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-push", { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    let detailedMessage: string | null = null;
    if (context) {
      try {
        detailedMessage = (await context.clone().json())?.error ?? null;
      } catch {
        // Cai na mensagem genérica abaixo.
      }
    }
    throw new Error(detailedMessage ?? error.message);
  }
  return data as T;
}

// --- Push neste aparelho ---------------------------------------------------

export type PushState =
  | "unsupported" // navegador sem Web Push
  | "needs-install" // iPhone/iPad: só funciona com o app instalado na tela inicial
  | "denied" // usuário bloqueou as notificações do site
  | "off"
  | "on";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerAdminServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function enablePushOnThisDevice(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permissão de notificação negada neste navegador.");
  }

  const { publicKey } = await invokeAdminPush<{ publicKey: string }>({ action: "public-key" });
  await registerAdminServiceWorker();
  const registration = await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  // Inscrição antiga feita com outra chave VAPID não serve mais — refaz.
  const currentKey = subscription?.options.applicationServerKey;
  const expectedKey = urlBase64ToUint8Array(publicKey);
  if (
    subscription &&
    currentKey &&
    new Uint8Array(currentKey).toString() !== expectedKey.toString()
  ) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: expectedKey,
  });

  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function disablePushOnThisDevice(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
  await subscription.unsubscribe();
}

export async function sendTestPush(): Promise<number> {
  const { delivered } = await invokeAdminPush<{ delivered: number }>({ action: "test" });
  return delivered;
}

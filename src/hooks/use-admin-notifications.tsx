import * as React from "react";
import { supabase } from "@/lib/supabase";
import {
  countUnreadAdminNotifications,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  registerAdminServiceWorker,
} from "@/lib/api/notifications";
import type { DbAdminNotification } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

interface AdminNotificationsContextValue {
  notifications: DbAdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const AdminNotificationsContext =
  React.createContext<AdminNotificationsContextValue | null>(null);

// Uma única inscrição Realtime para o painel todo (mesmo motivo de
// usePendingOrdersCount em AdminLayout): o sininho, o menu e a página
// Notificações leem daqui.
export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [notifications, setNotifications] = React.useState<DbAdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([
        listAdminNotifications(),
        countUnreadAdminNotifications(),
      ]);
      setNotifications(list);
      setUnreadCount(unread);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar notificações.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
    // Mantém o service worker do push atualizado sempre que o painel abre.
    registerAdminServiceWorker().catch(() => {});

    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const notification = payload.new as DbAdminNotification;
          showToast(notification.title, notification.body ?? undefined);
          reload();
        },
      )
      .subscribe();

    function onFocus() {
      reload();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload, showToast]);

  const markRead = React.useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.read_at) return;
      const readAt = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await markAdminNotificationRead(id);
      } catch {
        reload();
      }
    },
    [notifications, reload],
  );

  const markAllRead = React.useCallback(async () => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: readAt })));
    setUnreadCount(0);
    try {
      await markAllAdminNotificationsRead();
    } catch {
      reload();
    }
  }, [reload]);

  const value = React.useMemo(
    () => ({ notifications, unreadCount, loading, error, reload, markRead, markAllRead }),
    [notifications, unreadCount, loading, error, reload, markRead, markAllRead],
  );

  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}

export function useAdminNotifications() {
  const ctx = React.useContext(AdminNotificationsContext);
  if (!ctx) {
    throw new Error("useAdminNotifications precisa estar dentro de AdminNotificationsProvider");
  }
  return ctx;
}

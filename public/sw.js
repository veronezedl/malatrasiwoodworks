// Service worker do painel admin: só recebe as notificações push (vendas,
// pedidos novos) e abre o pedido ao tocar nelas. Não faz cache nenhum — o
// site continua sendo servido sempre da rede.
// O conteúdo do push é montado em supabase/functions/_shared/adminNotifications.ts.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Malatrasi WoodWorks", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/notification-badge.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      vibrate: [200, 100, 200],
      data: { url: data.url || "/admin/notificacoes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reaproveita o painel já aberto (app instalado ou aba) em vez de abrir outro.
      const existing = windows.find((w) => new URL(w.url).pathname.startsWith("/admin"));
      if (existing) {
        try {
          await existing.focus();
          await existing.navigate(url);
          return;
        } catch {
          // Janela fora do controle deste service worker — abre uma nova.
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

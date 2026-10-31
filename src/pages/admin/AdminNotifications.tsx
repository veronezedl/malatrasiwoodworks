import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, BellRing, CheckCheck, ShoppingBag, Wallet } from "lucide-react";
import {
  disablePushOnThisDevice,
  enablePushOnThisDevice,
  getPushState,
  sendTestPush,
  type PushState,
} from "@/lib/api/notifications";
import type { DbAdminNotification } from "@/types/database";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const PUSH_STATE_TEXT: Record<PushState, string> = {
  on: "Ativas neste aparelho. Cada venda aparece aqui como notificação, mesmo com o painel fechado.",
  off: "Desativadas neste aparelho. Ative para receber um aviso no celular a cada venda.",
  denied:
    "As notificações deste site estão bloqueadas no navegador. Libere em Configurações do site → Notificações e recarregue a página.",
  "needs-install":
    "No iPhone, primeiro adicione o painel à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá.",
  unsupported: "Este navegador não suporta notificações push. No Android, use o Chrome.",
};

function PushDeviceCard() {
  const { showToast } = useToast();
  const [state, setState] = React.useState<PushState | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    getPushState().then(setState, () => setState("unsupported"));
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      showToast("Não foi possível concluir", err instanceof Error ? err.message : undefined);
    } finally {
      setState(await getPushState().catch(() => "unsupported" as const));
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Notificações neste aparelho</CardTitle>
          {state === "on" && <Badge variant="success">Ativas</Badge>}
        </div>
        <CardDescription>{state ? PUSH_STATE_TEXT[state] : "Verificando..."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {state === "off" && (
          <Button
            disabled={busy}
            onClick={() =>
              run(async () => {
                await enablePushOnThisDevice();
                await sendTestPush();
                showToast("Notificações ativadas", "Enviamos uma notificação de teste.");
              })
            }
          >
            <BellRing className="size-4" />
            {busy ? "Ativando..." : "Ativar notificações"}
          </Button>
        )}
        {state === "on" && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const delivered = await sendTestPush();
                  showToast(
                    delivered > 0 ? "Teste enviado" : "Nenhum aparelho recebeu o teste",
                    delivered > 0
                      ? `Enviado para ${delivered} aparelho(s).`
                      : "Desative e ative de novo as notificações neste aparelho.",
                  );
                })
              }
            >
              <BellRing className="size-4" />
              Enviar teste
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await disablePushOnThisDevice();
                  showToast("Notificações desativadas neste aparelho");
                })
              }
            >
              <BellOff className="size-4" />
              Desativar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationIcon({ type }: { type: DbAdminNotification["type"] }) {
  const Icon = type === "payment_approved" ? Wallet : ShoppingBag;
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
        type === "payment_approved" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
      }`}
    >
      <Icon className="size-4" />
    </span>
  );
}

export function AdminNotifications() {
  useSeo("Notificações · Admin Malatrasi WoodWorks", "Central de notificações.");
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } =
    useAdminNotifications();

  function open(notification: DbAdminNotification) {
    markRead(notification.id);
    if (notification.url) navigate(notification.url);
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Notificações</h1>
      <p className="mt-1 text-sm text-text-muted">
        Pedidos novos e vendas confirmadas pelo Mercado Pago.
      </p>

      <div className="mt-6">
        <PushDeviceCard />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-semibold text-primary">
          Recentes
          {unreadCount > 0 && (
            <span className="ml-2 text-sm font-normal text-text-muted">
              {unreadCount} não lida(s)
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead()}>
            <CheckCheck className="size-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 py-10 text-center text-text-muted">Carregando...</p>
      ) : error ? (
        <p className="mt-4 py-10 text-center text-text-muted">{error}</p>
      ) : notifications.length === 0 ? (
        <p className="mt-4 py-10 text-center text-text-muted">
          Nenhuma notificação ainda. Elas aparecem aqui a cada pedido novo e venda confirmada.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-black/10 overflow-hidden rounded-brand border border-black/10 bg-white">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-muted ${
                  n.read_at ? "" : "bg-accent/5"
                }`}
              >
                <NotificationIcon type={n.type} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm text-primary ${n.read_at ? "" : "font-semibold"}`}
                  >
                    {n.title}
                  </span>
                  {n.body && (
                    <span className="mt-0.5 block text-sm text-text-muted">{n.body}</span>
                  )}
                  <span className="mt-1 block text-xs text-text-muted">
                    {dateTimeFmt.format(new Date(n.created_at))}
                  </span>
                </span>
                {!n.read_at && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Não lida" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

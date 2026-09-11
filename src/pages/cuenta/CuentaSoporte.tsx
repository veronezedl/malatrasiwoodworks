import * as React from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import { LifeBuoy } from "lucide-react";
import { createSupportRequest, listMySupportRequests } from "@/lib/api/support";
import { listOrders } from "@/lib/api/orders";
import {
  SUPPORT_REQUEST_STATUS_LABELS,
  type DbSupportRequest,
  type OrderWithCustomer,
} from "@/types/database";
import type { CuentaContext } from "@/components/customer/CuentaLayout";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const SUBJECT_OPTIONS = [
  "Status do meu pedido",
  "Produto com defeito",
  "Troca ou devolução",
  "Pagamento ou nota fiscal",
  "Outro",
];

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const STATUS_VARIANT: Record<
  DbSupportRequest["status"],
  "default" | "primary" | "success"
> = {
  open: "default",
  in_progress: "primary",
  resolved: "success",
};

interface SoporteLocationState {
  orderId?: string;
  orderNumber?: string;
}

export function CuentaSoporte() {
  useSeo(
    "Suporte · Malatrasi WoodWorks",
    "Solicite atendimento sobre seus pedidos na Malatrasi WoodWorks.",
  );
  const { customer } = useOutletContext<CuentaContext>();
  const location = useLocation();
  const preselected = location.state as SoporteLocationState | null;
  const { showToast } = useToast();

  const [orders, setOrders] = React.useState<OrderWithCustomer[]>([]);
  const [requests, setRequests] = React.useState<DbSupportRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [subject, setSubject] = React.useState(SUBJECT_OPTIONS[0]);
  const [orderId, setOrderId] = React.useState(preselected?.orderId ?? "");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [ordersData, requestsData] = await Promise.all([
        listOrders(),
        listMySupportRequests(),
      ]);
      setOrders(ordersData);
      setRequests(requestsData);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Não foi possível carregar as informações.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await createSupportRequest({
        customerId: customer.id,
        subject,
        message,
        orderId: orderId || null,
      });
      showToast(
        "Solicitação enviada",
        "Responderemos o quanto antes por email.",
      );
      setMessage("");
      load();
    } catch (err) {
      showToast(
        "Não foi possível enviar",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Suporte</h1>
      <p className="mt-1 text-sm text-text-muted">
        Tem alguma dúvida ou problema? Conte para nós e entraremos em contato por email.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-brand border border-black/10 bg-white p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Assunto</Label>
            <Select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="order">Pedido relacionado (opcional)</Label>
            <Select
              id="order"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            >
              <option value="">Nenhum em particular</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.order_number}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={4}
          />
        </div>
        <Button type="submit" variant="accent" className="mt-4" disabled={submitting}>
          <LifeBuoy className="size-4" />{" "}
          {submitting ? "Enviando..." : "Enviar solicitação"}
        </Button>
      </form>

      <h2 className="mt-8 font-heading text-lg font-semibold text-primary">
        Suas solicitações
      </h2>
      {loading ? (
        <p className="mt-3 text-sm text-text-muted">Carregando...</p>
      ) : loadError ? (
        <p className="mt-3 text-sm text-accent">{loadError}</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          Você ainda não enviou nenhuma solicitação.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-black/10 rounded-brand border border-black/10 bg-white">
          {requests.map((r) => (
            <div key={r.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">{r.subject}</p>
                <Badge variant={STATUS_VARIANT[r.status]}>
                  {SUPPORT_REQUEST_STATUS_LABELS[r.status]}
                </Badge>
              </div>
              <p className="mt-1 text-text-muted">{r.message}</p>
              <p className="mt-2 text-xs text-text-muted">
                {dateTimeFmt.format(new Date(r.created_at))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

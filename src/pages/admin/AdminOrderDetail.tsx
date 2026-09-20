import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  getOrder,
  getOrderItems,
  getOrderStatusHistory,
  updateAdminNotes,
  updateOrderStatus,
  updatePaymentStatus,
} from "@/lib/api/orders";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  type DbOrderItem,
  type DbOrderStatusEvent,
  type OrderStatus,
  type OrderWithCustomer,
  type PaymentStatus,
} from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  useSeo("Detalhes do pedido · Admin Malatrasi WoodWorks", "Detalhes do pedido.");
  const { showToast } = useToast();

  const [order, setOrder] = React.useState<OrderWithCustomer | null>(null);
  const [items, setItems] = React.useState<DbOrderItem[]>([]);
  const [history, setHistory] = React.useState<DbOrderStatusEvent[]>([]);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [orderData, itemsData, historyData] = await Promise.all([
      getOrder(id),
      getOrderItems(id),
      getOrderStatusHistory(id),
    ]);
    setOrder(orderData);
    setItems(itemsData);
    setHistory(historyData);
    setNotes(orderData?.admin_notes ?? "");
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return;
    setSaving(true);
    try {
      await updateOrderStatus(order.id, status);
      setOrder({ ...order, status });
      showToast(
        "Status atualizado",
        "O cliente foi notificado por email.",
      );
      load();
    } catch (err) {
      showToast("Não foi possível atualizar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentStatusChange(paymentStatus: PaymentStatus) {
    if (!order) return;
    setSaving(true);
    try {
      await updatePaymentStatus(order.id, paymentStatus);
      setOrder({ ...order, payment_status: paymentStatus });
      showToast("Status de pagamento atualizado");
    } catch (err) {
      showToast("Não foi possível atualizar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    if (!order) return;
    setSaving(true);
    try {
      await updateAdminNotes(order.id, notes);
      showToast("Notas salvas");
    } catch (err) {
      showToast("Erro ao salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-text-muted">Carregando pedido...</p>;
  }
  if (!order) {
    return <p className="text-text-muted">Pedido não encontrado.</p>;
  }

  return (
    <div className="max-w-4xl">
      <Link
        to="/admin/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Voltar para pedidos
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-primary">
          Pedido {order.order_number}
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-brand border border-black/10 bg-white p-5">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Itens
            </h2>
            <div className="mt-3 divide-y divide-black/5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div>
                    <p className="text-text">{item.product_name}</p>
                    <p className="text-xs text-text-muted">
                      {item.quantity} × {currency.format(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-semibold text-primary">
                    {currency.format(item.quantity * item.unit_price)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-black/10 pt-3 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>Subtotal</span>
                <span>{currency.format(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Entrega{order.shipping_method_name ? ` (${order.shipping_method_name})` : ""}</span>
                <span>{currency.format(order.shipping_cost)}</span>
              </div>
              <div className="flex justify-between font-semibold text-primary">
                <span>Total</span>
                <span>{currency.format(order.total)}</span>
              </div>
            </div>
          </div>

          {(order.engraving_text || order.engraving_image_url) && (
            <div className="rounded-brand border border-black/10 bg-white p-5">
              <h2 className="font-heading text-sm font-semibold text-primary">
                Gravação personalizada
              </h2>
              {order.engraving_text && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-text">
                  {order.engraving_text}
                </p>
              )}
              {order.engraving_image_url && (
                <img
                  src={order.engraving_image_url}
                  alt="Referência de gravação enviada pelo cliente"
                  className="mt-3 max-h-56 rounded-brand border border-black/10 object-cover"
                />
              )}
            </div>
          )}

          <div className="rounded-brand border border-black/10 bg-white p-5">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Endereço de entrega
            </h2>
            <p className="mt-2 text-sm text-text">
              {order.shipping_full_name}
              <br />
              {order.shipping_address_line1}
              {order.shipping_address_number ? `, ${order.shipping_address_number}` : ""}
              {order.shipping_address_line2
                ? `, ${order.shipping_address_line2}`
                : ""}
              <br />
              {order.shipping_neighborhood ? `${order.shipping_neighborhood} · ` : ""}
              {order.shipping_postal_code} {order.shipping_city}
              {order.shipping_region ? `, ${order.shipping_region}` : ""}
              <br />
              {order.shipping_country_code}
              <br />
              {order.shipping_phone}
            </p>
          </div>

          <div className="rounded-brand border border-black/10 bg-white p-5">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Histórico de status
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {history.map((event) => (
                <li key={event.id} className="flex items-center justify-between">
                  <span className="text-text">
                    {ORDER_STATUS_LABELS[event.status]}
                  </span>
                  <span className="text-xs text-text-muted">
                    {dateTimeFmt.format(new Date(event.created_at))}
                    {event.notified_email && " · email ✓"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-brand border border-black/10 bg-white p-5">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Cliente
            </h2>
            <p className="mt-2 text-sm text-text">{order.customer?.full_name}</p>
            <p className="text-sm text-text-muted">{order.customer?.email}</p>
            <p className="text-sm text-text-muted">{order.customer?.phone}</p>
          </div>

          <div className="rounded-brand border border-black/10 bg-white p-5">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Forma de pagamento
            </h2>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-text">
                {PAYMENT_METHOD_LABELS[order.payment_method]}
              </p>
              <PaymentStatusBadge status={order.payment_status} />
            </div>

            {order.payment_method === "mercadopago" && (
              <div className="mt-3 rounded-brand bg-bg-muted p-3 text-xs text-text-muted">
                <p>
                  Status no Mercado Pago:{" "}
                  <span className="font-medium text-text">
                    {order.mp_status ?? "aguardando pagamento"}
                  </span>
                </p>
                {order.mp_payment_id && (
                  <p className="mt-1">ID do pagamento: {order.mp_payment_id}</p>
                )}
              </div>
            )}

            <div className="mt-4 border-t border-black/10 pt-4">
              <Label htmlFor="payment-status-select">Marcar pagamento como</Label>
              <Select
                id="payment-status-select"
                className="mt-2"
                value={order.payment_status}
                disabled={saving}
                onChange={(e) =>
                  handlePaymentStatusChange(e.target.value as PaymentStatus)
                }
              >
                {PAYMENT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
              <p className="mt-2 text-xs text-text-muted">
                {order.payment_method === "mercadopago"
                  ? "Pedidos pagos pelo Mercado Pago atualizam sozinhos quando o pagamento é aprovado — só mude aqui manualmente em caso de exceção."
                  : "Não há cobrança automática — atualize isso manualmente quando confirmar o recebimento do pagamento combinado com o cliente."}
              </p>
            </div>
          </div>

          <div className="rounded-brand border border-black/10 bg-white p-5">
            <Label htmlFor="status-select">Mudar status</Label>
            <Select
              id="status-select"
              className="mt-2"
              value={order.status}
              disabled={saving}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
            >
              {ORDER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-text-muted">
              Ao mudar o status, o cliente é notificado automaticamente por email.
            </p>
          </div>

          <div className="rounded-brand border border-black/10 bg-white p-5">
            <Label htmlFor="admin-notes">Notas internas</Label>
            <Textarea
              id="admin-notes"
              className="mt-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              onClick={handleSaveNotes}
              disabled={saving}
            >
              Salvar notas
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

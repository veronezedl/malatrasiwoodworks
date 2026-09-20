import * as React from "react";
import { Link } from "react-router-dom";
import { Eye, ArrowUpRight } from "lucide-react";
import { getOrder, getOrderItems, getOrderStatusHistory } from "@/lib/api/orders";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type DbOrderItem,
  type DbOrderStatusEvent,
  type OrderWithCustomer,
} from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import { Button } from "@/components/ui/button";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function AdminOrderQuickView({ orderId }: { orderId: string }) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [order, setOrder] = React.useState<OrderWithCustomer | null>(null);
  const [items, setItems] = React.useState<DbOrderItem[]>([]);
  const [history, setHistory] = React.useState<DbOrderStatusEvent[]>([]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getOrder(orderId),
      getOrderItems(orderId),
      getOrderStatusHistory(orderId),
    ]).then(([o, i, h]) => {
      if (cancelled) return;
      setOrder(o);
      setItems(i);
      setHistory(h);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-text-muted hover:text-primary"
        >
          <Eye className="size-4" /> Ver mais
        </button>
      </DialogTrigger>
      <DialogContent>
        {loading || !order ? (
          <p className="py-8 text-center text-sm text-text-muted">Carregando...</p>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle>Pedido {order.order_number}</DialogTitle>
                <OrderStatusBadge status={order.status} />
              </div>
            </DialogHeader>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Cliente
              </h3>
              <p className="mt-1 text-sm text-text">{order.customer?.full_name}</p>
              <p className="text-sm text-text-muted">{order.customer?.email}</p>
              <p className="text-sm text-text-muted">{order.customer?.phone}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Forma de pagamento
              </h3>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm text-text">
                  {PAYMENT_METHOD_LABELS[order.payment_method]}
                </p>
                <PaymentStatusBadge status={order.payment_status} />
              </div>
            </div>

            {(order.engraving_text || order.engraving_image_url) && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Gravação personalizada
                </h3>
                {order.engraving_text && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                    {order.engraving_text}
                  </p>
                )}
                {order.engraving_image_url && (
                  <img
                    src={order.engraving_image_url}
                    alt="Referência de gravação enviada pelo cliente"
                    className="mt-2 max-h-40 rounded-brand border border-black/10 object-cover"
                  />
                )}
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Endereço de entrega
              </h3>
              <p className="mt-1 text-sm text-text">
                {order.shipping_address_line1}
                {order.shipping_address_line2
                  ? `, ${order.shipping_address_line2}`
                  : ""}
                <br />
                {order.shipping_neighborhood ? `${order.shipping_neighborhood} · ` : ""}
                {order.shipping_postal_code} {order.shipping_city}
                {order.shipping_region ? `, ${order.shipping_region}` : ""}
                <br />
                {order.shipping_country_code}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Itens
              </h3>
              <div className="mt-2 divide-y divide-black/5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 text-sm"
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
              <div className="mt-2 space-y-1 border-t border-black/10 pt-2 text-sm">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span>{currency.format(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Entrega{order.shipping_method_name ? ` (${order.shipping_method_name})` : ""}</span>
                  <span>{currency.format(order.shipping_cost)}</span>
                </div>
              </div>
              <div className="mt-1 flex justify-between border-t border-black/10 pt-2 text-sm font-semibold text-primary">
                <span>Total</span>
                <span>{currency.format(order.total)}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Histórico de status
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {history.map((event) => (
                  <li key={event.id} className="flex items-center justify-between">
                    <span className="text-text">
                      {ORDER_STATUS_LABELS[event.status]}
                    </span>
                    <span className="text-xs text-text-muted">
                      {dateTimeFmt.format(new Date(event.created_at))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Button asChild variant="outline" size="sm">
              <Link to={`/admin/pedidos/${order.id}`}>
                Abrir pedido completo <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

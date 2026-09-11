import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { getOrder, getOrderItems, getOrderStatusHistory } from "@/lib/api/orders";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type DbOrderItem,
  type DbOrderStatusEvent,
  type OrderWithCustomer,
} from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import { OrderTracker } from "@/components/customer/OrderTracker";
import { Button } from "@/components/ui/button";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function CuentaPedidoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useSeo(
    "Detalhes do pedido · Malatrasi WoodWorks",
    "Consulte o status e os detalhes do seu pedido.",
  );

  const [order, setOrder] = React.useState<OrderWithCustomer | null>(null);
  const [items, setItems] = React.useState<DbOrderItem[]>([]);
  const [history, setHistory] = React.useState<DbOrderStatusEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getOrder(id), getOrderItems(id), getOrderStatusHistory(id)]).then(
      ([orderData, itemsData, historyData]) => {
        setOrder(orderData);
        setItems(itemsData);
        setHistory(historyData);
        setLoading(false);
      },
    );
  }, [id]);

  if (loading) {
    return <p className="text-text-muted">Carregando pedido...</p>;
  }
  if (!order) {
    return <p className="text-text-muted">Pedido não encontrado.</p>;
  }

  return (
    <div>
      <Link
        to="/conta/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Voltar para meus pedidos
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-primary">
          Pedido {order.order_number}
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-brand border border-black/10 bg-white p-5">
        <div className="min-w-[420px]">
          <OrderTracker status={order.status} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
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
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-brand border border-black/10 bg-white p-5">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Endereço de entrega
            </h2>
            <p className="mt-2 text-sm text-text">
              {order.shipping_full_name}
              <br />
              {order.shipping_address_line1}
              {order.shipping_address_line2
                ? `, ${order.shipping_address_line2}`
                : ""}
              <br />
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
              Forma de pagamento
            </h2>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-text">
                {PAYMENT_METHOD_LABELS[order.payment_method]}
              </p>
              <PaymentStatusBadge status={order.payment_status} />
            </div>
          </div>

          <div className="rounded-brand border border-black/10 bg-white p-5">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Precisa de ajuda?
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Escreva sobre este pedido e responderemos por email.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() =>
                navigate("/conta/suporte", {
                  state: { orderId: order.id, orderNumber: order.order_number },
                })
              }
            >
              <LifeBuoy className="size-4" /> Solicitar atendimento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

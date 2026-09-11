import * as React from "react";
import { Link } from "react-router-dom";
import { listOrders } from "@/lib/api/orders";
import type { OrderWithCustomer } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

export function CuentaPedidos() {
  useSeo(
    "Meus pedidos · Malatrasi WoodWorks",
    "Consulte o histórico completo dos seus pedidos na Malatrasi WoodWorks.",
  );
  const [orders, setOrders] = React.useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">
        Meus pedidos
      </h1>

      {loading ? (
        <p className="mt-4 text-sm text-text-muted">Carregando...</p>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          Você ainda não fez nenhum pedido.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-black/10 rounded-brand border border-black/10 bg-white">
          {orders.map((order) => (
            <Link
              key={order.id}
              to={`/conta/pedidos/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm hover:bg-bg-muted"
            >
              <div>
                <p className="font-semibold text-primary">{order.order_number}</p>
                <p className="text-xs text-text-muted">
                  {dateFmt.format(new Date(order.created_at))}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-primary">
                  {currency.format(order.total)}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

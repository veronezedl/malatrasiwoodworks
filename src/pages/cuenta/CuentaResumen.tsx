import * as React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Hourglass, Clock, Wallet, PackageCheck } from "lucide-react";
import { listOrders } from "@/lib/api/orders";
import type { OrderStatus, OrderWithCustomer } from "@/types/database";
import type { CuentaContext } from "@/components/customer/CuentaLayout";
import { useSeo } from "@/hooks/use-seo";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

const IN_PROGRESS: OrderStatus[] = ["pending", "confirmed", "processing", "shipped"];
const AWAITING_SHIPMENT: OrderStatus[] = ["pending", "confirmed", "processing"];

export function CuentaResumen() {
  useSeo("Minha conta · Malatrasi WoodWorks", "Resumo da sua conta na Malatrasi WoodWorks.");
  const { customer } = useOutletContext<CuentaContext>();
  const [orders, setOrders] = React.useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
    .reduce((sum, o) => sum + o.total, 0);
  const inProgressCount = orders.filter((o) =>
    IN_PROGRESS.includes(o.status),
  ).length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const awaitingShipmentCount = orders.filter((o) =>
    AWAITING_SHIPMENT.includes(o.status),
  ).length;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">
        Olá, {(customer.full_name || "").split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        Este é o resumo da sua conta.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-brand border border-black/10 bg-white p-5">
          <Hourglass className="size-5 text-accent" />
          <p className="mt-2 text-2xl font-bold text-primary">
            {awaitingShipmentCount}
          </p>
          <p className="text-xs text-text-muted">Aguardando envio</p>
        </div>
        <div className="rounded-brand border border-black/10 bg-white p-5">
          <Clock className="size-5 text-accent" />
          <p className="mt-2 text-2xl font-bold text-primary">
            {inProgressCount}
          </p>
          <p className="text-xs text-text-muted">Pedidos em andamento</p>
        </div>
        <div className="rounded-brand border border-black/10 bg-white p-5">
          <PackageCheck className="size-5 text-accent" />
          <p className="mt-2 text-2xl font-bold text-primary">
            {deliveredCount}
          </p>
          <p className="text-xs text-text-muted">Pedidos entregues</p>
        </div>
        <div className="rounded-brand border border-black/10 bg-white p-5">
          <Wallet className="size-5 text-accent" />
          <p className="mt-2 text-2xl font-bold text-primary">
            {currency.format(totalSpent)}
          </p>
          <p className="text-xs text-text-muted">Total gasto</p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-primary">
          Últimos pedidos
        </h2>
        <Link
          to="/conta/pedidos"
          className="text-sm font-semibold text-accent hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-text-muted">Carregando...</p>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          Você ainda não fez nenhum pedido.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-black/10 rounded-brand border border-black/10 bg-white">
          {orders.slice(0, 5).map((order) => (
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

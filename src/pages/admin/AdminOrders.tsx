import * as React from "react";
import { Link } from "react-router-dom";
import { listOrders, updateOrderStatus } from "@/lib/api/orders";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_LABELS,
} from "@/types/database";
import type { OrderWithCustomer } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Select } from "@/components/ui/select";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { PaymentStatusBadge } from "@/components/admin/PaymentStatusBadge";
import { AdminOrderQuickView } from "@/components/admin/AdminOrderQuickView";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function AdminOrders() {
  useSeo("Pedidos · Admin Malatrasi WoodWorks", "Gestão de pedidos.");
  const { showToast } = useToast();
  const [orders, setOrders] = React.useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await listOrders());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(orderId: string, status: string) {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status as OrderWithCustomer["status"]);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: status as OrderWithCustomer["status"] }
            : o,
        ),
      );
      showToast(
        "Status atualizado",
        "O cliente foi notificado por email.",
      );
    } catch (err) {
      showToast(
        "Não foi possível atualizar",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-bold text-primary">
          Pedidos
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-brand bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">Carregando pedidos...</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">Ainda não há pedidos.</p>
      ) : (
        <>
          {/* Mobile: cards — muitas colunas não cabem em uma tela pequena */}
          <div className="mt-6 space-y-3 md:hidden">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-brand border border-black/10 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/pedidos/${order.id}`}
                      className="font-semibold text-primary hover:text-accent"
                    >
                      {order.order_number}
                    </Link>
                    <p className="truncate text-sm text-text">
                      {order.customer?.full_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {dateFmt.format(new Date(order.created_at))}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-primary">
                    {currency.format(order.total)}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Select
                    value={order.status}
                    disabled={updatingId === order.id}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="h-9 flex-1 py-0 text-xs"
                  >
                    {ORDER_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <PaymentStatusBadge status={order.payment_status} />
                  <AdminOrderQuickView orderId={order.id} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: tabela completa */}
          <div className="mt-6 hidden overflow-x-auto rounded-brand border border-black/10 bg-white md:block">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-black/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        to={`/admin/pedidos/${order.id}`}
                        className="font-semibold text-primary hover:text-accent"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-text">{order.customer?.full_name}</div>
                      <div className="text-xs text-text-muted">
                        {order.customer?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {dateFmt.format(new Date(order.created_at))}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {currency.format(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-text-muted">
                        {PAYMENT_METHOD_LABELS[order.payment_method]}
                      </div>
                      <div className="mt-1">
                        <PaymentStatusBadge status={order.payment_status} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                          className="h-9 min-w-[160px] py-0 text-xs"
                        >
                          {ORDER_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {ORDER_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </Select>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <AdminOrderQuickView orderId={order.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

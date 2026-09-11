import { supabase } from "@/lib/supabase";
import type { OrderStatus } from "@/types/database";

export interface DailyPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface TopCustomer {
  customerId: string;
  name: string;
  email: string;
  total: number;
  orderCount: number;
}

export interface DashboardData {
  orders: number;
  revenue: number;
  avgOrderValue: number;
  statusBreakdown: Partial<Record<OrderStatus, number>>;
  dailySeries: DailyPoint[];
  bestSellingProduct: { name: string; quantity: number } | null;
  topCustomers: TopCustomer[];
}

export interface DashboardFilters {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  countedStatuses: OrderStatus[];
}

// Agrupa por data de calendário LOCAL (não UTC) — consistente com
// toInputDate() em AdminDashboard.tsx, que monta o intervalo de datas a
// partir do calendário local do admin.
function dayKey(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface OrderRow {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  order_items: { product_id: string | null; product_name: string; quantity: number }[];
  customer: { full_name: string; email: string } | null;
}

// PostgREST devolve no máximo 1000 linhas por consulta (db-max-rows) —
// pagina com .range() até esgotar os resultados.
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  buildQuery: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export async function fetchDashboardData(
  filters: DashboardFilters,
): Promise<DashboardData> {
  const fromIso = new Date(`${filters.from}T00:00:00`).toISOString();
  const toIso = new Date(`${filters.to}T23:59:59.999`).toISOString();

  const [rawOrders, events] = await Promise.all([
    // Supabase infere "customer" como array pelo embed, embora em runtime
    // seja um único objeto (customer_id é unique).
    fetchAllRows((from, to) =>
      supabase
        .from("orders")
        .select(
          "id, customer_id, status, total, created_at, order_items(product_id, product_name, quantity), customer:customers(full_name, email)",
        )
        .order("id")
        .range(from, to),
    ),
    fetchAllRows<{ order_id: string; status: OrderStatus; created_at: string }>(
      (from, to) =>
        supabase
          .from("order_status_events")
          .select("order_id, status, created_at")
          .gte("created_at", fromIso)
          .lte("created_at", toIso)
          .order("id")
          .range(from, to),
    ),
  ]);
  const allOrders = rawOrders as unknown as OrderRow[];

  // Data em que cada pedido atingiu seu status ATUAL (não a de criação) —
  // assim "Hoje" reflete pedidos que mudaram de status hoje, mesmo que
  // tenham sido criados antes.
  const ordersById = new Map(allOrders.map((o) => [o.id, o]));
  const statusReachedAt = new Map<string, string>();
  for (const event of events) {
    const order = ordersById.get(event.order_id);
    if (!order || order.status !== event.status) continue;
    const current = statusReachedAt.get(event.order_id);
    if (!current || event.created_at > current) {
      statusReachedAt.set(event.order_id, event.created_at);
    }
  }

  const orders = allOrders.filter((o) => statusReachedAt.has(o.id));

  const countedSet = new Set(filters.countedStatuses);
  const countedOrders = orders.filter((o) => countedSet.has(o.status));

  const revenue = countedOrders.reduce((sum, o) => sum + o.total, 0);
  const ordersCount = countedOrders.length;
  const avgOrderValue = ordersCount ? revenue / ordersCount : 0;

  const statusBreakdown: Partial<Record<OrderStatus, number>> = {};
  for (const o of orders) {
    statusBreakdown[o.status] = (statusBreakdown[o.status] ?? 0) + 1;
  }

  const dayMap = new Map<string, DailyPoint>();
  function getPoint(key: string): DailyPoint {
    let point = dayMap.get(key);
    if (!point) {
      point = { date: key, orders: 0, revenue: 0 };
      dayMap.set(key, point);
    }
    return point;
  }
  for (const o of countedOrders) {
    const point = getPoint(dayKey(statusReachedAt.get(o.id)!));
    point.orders += 1;
    point.revenue += o.total;
  }
  const dailySeries = [...dayMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const qtyMap = new Map<string, { name: string; quantity: number }>();
  for (const o of countedOrders) {
    for (const item of o.order_items ?? []) {
      const key = item.product_id ?? item.product_name;
      const entry = qtyMap.get(key) ?? { name: item.product_name, quantity: 0 };
      entry.quantity += item.quantity;
      qtyMap.set(key, entry);
    }
  }
  let bestSellingProduct: { name: string; quantity: number } | null = null;
  for (const entry of qtyMap.values()) {
    if (!bestSellingProduct || entry.quantity > bestSellingProduct.quantity) {
      bestSellingProduct = entry;
    }
  }

  const customerMap = new Map<string, TopCustomer>();
  for (const o of countedOrders) {
    const entry = customerMap.get(o.customer_id) ?? {
      customerId: o.customer_id,
      name: o.customer?.full_name ?? "—",
      email: o.customer?.email ?? "",
      total: 0,
      orderCount: 0,
    };
    entry.total += o.total;
    entry.orderCount += 1;
    customerMap.set(o.customer_id, entry);
  }
  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    orders: ordersCount,
    revenue,
    avgOrderValue,
    statusBreakdown,
    dailySeries,
    bestSellingProduct,
    topCustomers,
  };
}

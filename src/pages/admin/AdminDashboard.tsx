import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ShoppingBag, Wallet, Receipt } from "lucide-react";
import { fetchDashboardData, type DashboardData } from "@/lib/api/dashboard";
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS, type OrderStatus } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { Input } from "@/components/ui/input";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const shortDateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const DEFAULT_COUNTED: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#94a3b8",
  confirmed: "#1f1710",
  processing: "#b28d3e",
  shipped: "#1e8e5a",
  delivered: "#16a34a",
  cancelled: "#c0392b",
  refunded: "#b45309",
};

type Preset = "today" | "7d" | "30d" | "custom";

// Data no calendário LOCAL do admin (não UTC) — toISOString() usa UTC, então
// perto da meia-noite podia devolver "amanhã" ou "ontem" conforme o fuso
// horário, e o preset "Hoje" acabava consultando o dia errado.
function toInputDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to = toInputDate(now);
  if (preset === "today") return { from: to, to };
  const from = new Date(now);
  from.setDate(from.getDate() - (preset === "7d" ? 6 : 29));
  return { from: toInputDate(from), to };
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-brand border border-black/10 bg-white p-5">
      <Icon className="size-5 text-accent" />
      <p className="mt-2 font-heading text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

export function AdminDashboard() {
  useSeo("Dashboard · Admin Malatrasi WoodWorks", "Métricas da operação da loja.");
  const [preset, setPreset] = React.useState<Preset>("7d");
  const [range, setRange] = React.useState(() => presetRange("7d"));
  const [countedStatuses, setCountedStatuses] = React.useState<OrderStatus[]>(DEFAULT_COUNTED);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  function selectPreset(p: Preset) {
    setPreset(p);
    if (p !== "custom") setRange(presetRange(p));
  }

  function toggleStatus(status: OrderStatus) {
    setCountedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData({
        from: range.from,
        to: range.to,
        countedStatuses,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar o dashboard.");
    } finally {
      setLoading(false);
    }
  }, [range, countedStatuses]);

  React.useEffect(() => {
    load();
  }, [load]);

  const statusPieData = data
    ? ORDER_STATUS_OPTIONS.filter((s) => (data.statusBreakdown[s] ?? 0) > 0).map((s) => ({
        name: ORDER_STATUS_LABELS[s],
        value: data.statusBreakdown[s] ?? 0,
        color: STATUS_COLORS[s],
      }))
    : [];

  const chartKey = `${range.from}_${range.to}_${countedStatuses.join(",")}`;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Dashboard</h1>
      <p className="mt-1 text-sm text-text-muted">Resumo da operação da loja.</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["today", "7d", "30d", "custom"] as Preset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectPreset(p)}
            className={`rounded-brand px-3 py-1.5 text-sm font-medium transition-colors ${
              preset === p
                ? "bg-primary text-white"
                : "border border-black/10 bg-white text-text-muted hover:text-primary"
            }`}
          >
            {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "Personalizado"}
          </button>
        ))}

        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="h-9 w-auto"
            />
            <span className="text-sm text-text-muted">até</span>
            <Input
              type="date"
              value={range.to}
              min={range.from}
              max={toInputDate(new Date())}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="h-9 w-auto"
            />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-text-muted">
        O intervalo de datas filtra pela última mudança de status do pedido,
        não pela data de criação.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Contar como venda:
        </span>
        {ORDER_STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              countedStatuses.includes(s)
                ? "border-accent bg-accent/10 text-accent"
                : "border-black/10 text-text-muted hover:border-black/20"
            }`}
          >
            {ORDER_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-brand bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          {error}
        </div>
      )}

      {loading || !data ? (
        <p className="mt-8 text-sm text-text-muted">Carregando métricas...</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={ShoppingBag} label="Pedidos" value={data.orders.toLocaleString("pt-BR")} />
            <StatCard icon={Wallet} label="Faturamento" value={currency.format(data.revenue)} />
            <StatCard
              icon={Receipt}
              label="Valor médio por pedido"
              value={currency.format(data.avgOrderValue)}
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-1">
            <div className="rounded-brand border border-black/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Produto mais vendido
              </p>
              {data.bestSellingProduct ? (
                <>
                  <p className="mt-1 font-heading text-lg font-bold text-primary">
                    {data.bestSellingProduct.name}
                  </p>
                  <p className="text-sm text-text-muted">
                    {data.bestSellingProduct.quantity} unidades
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-text-muted">Sem dados neste período.</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-brand border border-black/10 bg-white p-5">
              <h2 className="font-heading text-sm font-semibold text-primary">
                Faturamento por dia
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer key={chartKey} width="100%" height="100%">
                  <LineChart data={data.dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => shortDateFmt.format(new Date(`${d}T00:00:00`))}
                      tick={{ fontSize: 12, fill: "#6b5f4f" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#6b5f4f" }}
                      tickFormatter={(v) => currency.format(Number(v))}
                      width={70}
                    />
                    <Tooltip
                      labelFormatter={(d) => shortDateFmt.format(new Date(`${d}T00:00:00`))}
                      formatter={(value: number) => currency.format(value)}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Faturamento"
                      stroke="#b28d3e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-brand border border-black/10 bg-white p-5">
              <h2 className="font-heading text-sm font-semibold text-primary">
                Pedidos por dia
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer key={chartKey} width="100%" height="100%">
                  <BarChart data={data.dailySeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => shortDateFmt.format(new Date(`${d}T00:00:00`))}
                      tick={{ fontSize: 12, fill: "#6b5f4f" }}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b5f4f" }} />
                    <Tooltip labelFormatter={(d) => shortDateFmt.format(new Date(`${d}T00:00:00`))} />
                    <Bar dataKey="orders" name="Pedidos" fill="#1f1710" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-brand border border-black/10 bg-white p-5 lg:col-span-2">
              <h2 className="font-heading text-sm font-semibold text-primary">
                Pedidos por status
              </h2>
              {statusPieData.length === 0 ? (
                <p className="mt-4 text-sm text-text-muted">Sem pedidos neste período.</p>
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer key={chartKey} width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {statusPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-brand border border-black/10 bg-white p-5">
            <h2 className="font-heading text-sm font-semibold text-primary">
              Top 10 clientes
            </h2>
            {data.topCustomers.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">Sem pedidos neste período.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                      <th className="py-2 font-medium">Cliente</th>
                      <th className="py-2 font-medium">Pedidos</th>
                      <th className="py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topCustomers.map((c) => (
                      <tr key={c.customerId} className="border-b border-black/5 last:border-0">
                        <td className="py-2.5">
                          <div className="text-text">{c.name}</div>
                          <div className="text-xs text-text-muted">{c.email}</div>
                        </td>
                        <td className="py-2.5 text-text-muted">{c.orderCount}</td>
                        <td className="py-2.5 font-semibold text-primary">
                          {currency.format(c.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

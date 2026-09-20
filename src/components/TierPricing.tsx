import { TrendingDown } from "lucide-react";
import type { PriceTier } from "@/types/database";
import { activeTier, lowestTier } from "@/lib/pricing";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Chip de destaque do preço progressivo (cartão do catálogo e popup rápido).
export function TierBadge({
  tiers,
  basePrice,
  className = "",
}: {
  tiers: PriceTier[];
  // Preço vigente (promocional, se houver): faixas que não baixam o preço não aparecem.
  basePrice: number;
  className?: string;
}) {
  const low = lowestTier(tiers.filter((t) => t.unit_price < basePrice));
  if (!low) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent sm:text-[11px] ${className}`}
    >
      <TrendingDown className="size-3 shrink-0" />
      {low.min_qty}+ un. por {currency.format(low.unit_price)}
    </span>
  );
}

// Tabela de faixas da página do produto; destaca a faixa da quantidade
// escolhida pelo cliente.
export function TierTable({
  basePrice,
  tiers,
  quantity,
}: {
  basePrice: number;
  tiers: PriceTier[];
  quantity: number;
}) {
  const useful = tiers.filter((t) => t.unit_price < basePrice);
  if (useful.length === 0) return null;
  const sorted = [...useful].sort((a, b) => a.min_qty - b.min_qty);
  const current = activeTier(useful, quantity);
  const firstMin = sorted[0].min_qty;

  const rows = [
    {
      label: firstMin === 2 ? "1 un." : `1 a ${firstMin - 1} un.`,
      price: basePrice,
      active: !current,
    },
    ...sorted.map((tier, i) => {
      const next = sorted[i + 1];
      return {
        label: next
          ? next.min_qty - 1 === tier.min_qty
            ? `${tier.min_qty} un.`
            : `${tier.min_qty} a ${next.min_qty - 1} un.`
          : `${tier.min_qty}+ un.`,
        price: tier.unit_price,
        active: current?.min_qty === tier.min_qty,
      };
    }),
  ];

  return (
    <div className="mt-5 rounded-brand border border-accent/30 bg-accent/5 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
        <TrendingDown className="size-4" /> Compre mais, pague menos
      </p>
      <div className="mt-2 divide-y divide-black/5 text-sm">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between gap-3 py-1.5 ${
              row.active ? "font-semibold text-accent" : "text-text-muted"
            }`}
          >
            <span>{row.label}</span>
            <span>{currency.format(row.price)} cada</span>
          </div>
        ))}
      </div>
    </div>
  );
}

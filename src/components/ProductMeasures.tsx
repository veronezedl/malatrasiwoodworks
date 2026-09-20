import type { Product } from "@/data/products";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

// Largura, altura e peso cadastrados no produto; só mostra o que existir.
export function ProductMeasures({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const rows = [
    product.widthCm != null && { label: "Largura", value: `${number.format(product.widthCm)} cm` },
    product.heightCm != null && { label: "Altura", value: `${number.format(product.heightCm)} cm` },
    product.weightKg != null && { label: "Peso", value: `${number.format(product.weightKg)} kg` },
  ].filter((r): r is { label: string; value: string } => !!r);
  if (rows.length === 0) return null;

  return (
    <dl className={`flex flex-wrap gap-x-6 gap-y-1 text-sm ${className}`}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline gap-1.5">
          <dt className="text-text-muted">{row.label}:</dt>
          <dd className="font-medium text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

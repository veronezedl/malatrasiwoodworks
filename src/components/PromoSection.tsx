import { Flame } from "lucide-react";
import type { Product } from "@/data/products";
import { ProductGrid } from "@/components/ProductGrid";

// Produtos da promoção ativa. Sem produto em promoção a seção não aparece.
export function PromoSection({
  products,
  className = "",
}: {
  products: Product[];
  className?: string;
}) {
  if (products.length === 0) return null;
  return (
    <section className={className}>
      <h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-accent sm:text-3xl">
        <Flame className="size-6" /> Em promoção
      </h2>
      <p className="mt-1 mb-6 text-text-muted">
        Preços especiais por tempo limitado.
      </p>
      <ProductGrid products={products} />
    </section>
  );
}

import type { Product } from "@/data/products";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Preço do produto no catálogo: em promoção mostra o preço normal riscado, o
// preço promocional em destaque e a etiqueta "Promoção".
export function ProductPrice({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  if (product.isCustomOrder) return <p className={className}>Sob orçamento</p>;
  const promo = product.promoPrice;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      {promo != null && (
        <span className="text-[0.7em] font-normal text-text-muted line-through">
          {currency.format(product.price)}
        </span>
      )}
      <span className={promo != null ? "text-accent" : ""}>
        {currency.format(promo ?? product.price)}
      </span>
      {promo != null && (
        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
          Promoção
        </span>
      )}
    </p>
  );
}

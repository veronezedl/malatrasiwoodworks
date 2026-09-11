import { Link } from "react-router-dom";
import { Hammer, Ruler } from "lucide-react";
import type { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  return (
    <div className="flex flex-col overflow-hidden rounded-brand border border-black/10 bg-white transition-shadow hover:shadow-md">
      <Link
        to={`/produto/${product.slug}`}
        className="block aspect-square overflow-hidden bg-bg-muted"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <span className="text-[10px] font-medium uppercase tracking-wide text-accent sm:text-xs">
          {product.category}
        </span>
        <Link to={`/produto/${product.slug}`}>
          <h3 className="font-heading line-clamp-2 text-xs font-semibold text-primary hover:text-accent sm:text-sm">
            {product.name}
          </h3>
        </Link>
        <p className="font-heading text-base font-bold text-primary sm:text-lg">
          {product.isCustomOrder ? "Sob orçamento" : currency.format(product.price)}
        </p>

        <div className="flex flex-wrap gap-1.5 text-[10px] font-medium text-text-muted sm:gap-2 sm:text-[11px]">
          <span className="flex items-center gap-1 rounded-full bg-bg-muted px-1.5 py-0.5 sm:px-2 sm:py-1">
            <Hammer className="size-3" /> Feito à mão
          </span>
          {product.woodType && (
            <span className="hidden items-center gap-1 rounded-full bg-bg-muted px-2 py-1 sm:flex">
              <Ruler className="size-3" /> {product.woodType}
            </span>
          )}
        </div>

        {product.isCustomOrder ? (
          <Button asChild size="sm" className="mt-auto text-xs sm:text-sm">
            <Link to={`/orcamento?produto=${product.slug}`}>Solicitar orçamento</Link>
          </Button>
        ) : (
          <Button
            size="sm"
            className="mt-auto text-xs sm:text-sm"
            onClick={() => {
              if (addItem(product)) {
                showToast("Produto adicionado ao carrinho", product.name);
              }
            }}
            aria-label={`Adicionar ${product.name} ao carrinho`}
          >
            Adicionar ao carrinho
          </Button>
        )}
      </div>
    </div>
  );
}

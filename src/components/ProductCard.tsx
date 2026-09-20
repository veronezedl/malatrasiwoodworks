import * as React from "react";
import { Link } from "react-router-dom";
import { Hammer, Ruler } from "lucide-react";
import type { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { ProductQuickViewDialog } from "@/components/ProductQuickViewDialog";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { TierBadge } from "@/components/TierPricing";
import { ProductPrice } from "@/components/ProductPrice";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [quickViewOpen, setQuickViewOpen] = React.useState(false);

  return (
    <div className="flex flex-col overflow-hidden rounded-brand border border-black/10 bg-white transition-shadow hover:shadow-md">
      {/* div (não button) porque o carrossel já tem seus próprios botões de
          seta — um <button> dentro de outro <button> é inválido em HTML. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setQuickViewOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setQuickViewOpen(true);
        }}
        className="group relative block aspect-square cursor-pointer overflow-hidden bg-bg-muted"
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <ProductImageCarousel
          images={product.images}
          alt={product.name}
          className="h-full w-full [&_img]:transition-transform [&_img]:group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <span className="text-[10px] font-medium uppercase tracking-wide text-accent sm:text-xs">
          {product.category}
        </span>
        <button
          type="button"
          onClick={() => setQuickViewOpen(true)}
          className="text-left"
        >
          <h3 className="font-heading line-clamp-2 text-xs font-semibold text-primary hover:text-accent sm:text-sm">
            {product.name}
          </h3>
        </button>
        <ProductPrice
          product={product}
          className="font-heading text-base font-bold text-primary sm:text-lg"
        />
        {!product.isCustomOrder && (
          <TierBadge
            tiers={product.priceTiers}
            basePrice={product.promoPrice ?? product.price}
            className="self-start"
          />
        )}

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
            <Link to={`/orcamento?produto=${product.slug}`}>
              <span className="sm:hidden">Orçamento</span>
              <span className="hidden sm:inline">Solicitar orçamento</span>
            </Link>
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
            <span className="sm:hidden">Adicionar</span>
            <span className="hidden sm:inline">Adicionar ao carrinho</span>
          </Button>
        )}
      </div>

      <ProductQuickViewDialog
        product={product}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </div>
  );
}

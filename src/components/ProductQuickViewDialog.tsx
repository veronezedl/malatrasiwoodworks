import { TierBadge } from "@/components/TierPricing";
import { Link } from "react-router-dom";
import { Hammer, Ruler } from "lucide-react";
import type { Product } from "@/data/products";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface ProductQuickViewDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductQuickViewDialog({
  product,
  open,
  onOpenChange,
}: ProductQuickViewDialogProps) {
  const { addItem } = useCart();
  const { showToast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          <ProductImageCarousel
            images={product.images}
            alt={product.name}
            className="aspect-square w-28 shrink-0 overflow-hidden rounded-brand sm:w-36"
          />

          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-widest2 text-accent">
              {product.category}
            </span>
            <h2 className="mt-0.5 font-heading text-lg font-semibold leading-tight text-primary sm:text-xl">
              {product.name}
            </h2>
            <p className="mt-1 font-heading text-lg font-bold text-primary">
              {product.isCustomOrder ? "Sob orçamento" : currency.format(product.price)}
            </p>
            {!product.isCustomOrder && <TierBadge tiers={product.priceTiers} className="mt-1" />}
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-medium text-text-muted">
              <span className="flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5">
                <Hammer className="size-3" /> Feito à mão
              </span>
              {product.woodType && (
                <span className="flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5">
                  <Ruler className="size-3" /> {product.woodType}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">
          {product.description}
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {product.isCustomOrder ? (
            <Button asChild variant="accent" size="sm">
              <Link to={`/orcamento?produto=${product.slug}`}>
                Solicitar orçamento
              </Link>
            </Button>
          ) : (
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                if (addItem(product)) {
                  showToast("Produto adicionado ao carrinho", product.name);
                }
              }}
            >
              Adicionar ao carrinho
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={`/produto/${product.slug}`}>Ver página do produto</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

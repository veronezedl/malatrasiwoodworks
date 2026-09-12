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

        <img
          src={product.image}
          alt={product.name}
          className="aspect-square w-full rounded-brand object-cover"
        />

        <div>
          <span className="text-xs font-semibold uppercase tracking-widest2 text-accent">
            {product.category}
          </span>
          <h2 className="mt-1 font-heading text-2xl font-semibold text-primary">
            {product.name}
          </h2>
          <p className="mt-2 font-heading text-xl font-bold text-primary">
            {product.isCustomOrder ? "Sob orçamento" : currency.format(product.price)}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-text-muted">
          {product.description}
        </p>

        <div className="flex flex-wrap gap-2 text-xs font-medium text-text-muted">
          <span className="flex items-center gap-1 rounded-full bg-bg-muted px-2.5 py-1">
            <Hammer className="size-3.5" /> Feito à mão
          </span>
          {product.woodType && (
            <span className="flex items-center gap-1 rounded-full bg-bg-muted px-2.5 py-1">
              <Ruler className="size-3.5" /> {product.woodType}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {product.isCustomOrder ? (
            <Button asChild variant="accent" className="flex-1">
              <Link to={`/orcamento?produto=${product.slug}`}>
                Solicitar orçamento
              </Link>
            </Button>
          ) : (
            <Button
              variant="accent"
              className="flex-1"
              onClick={() => {
                if (addItem(product)) {
                  showToast("Produto adicionado ao carrinho", product.name);
                }
              }}
            >
              Adicionar ao carrinho
            </Button>
          )}
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/produto/${product.slug}`}>Ver página do produto</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

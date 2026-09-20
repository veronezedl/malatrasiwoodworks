import * as React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Hammer, ShieldCheck, Ruler, Minus, Plus } from "lucide-react";
import { fetchProductBySlug } from "@/lib/api/catalog";
import type { Product } from "@/data/products";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/hooks/use-seo";
import { ProductReviews } from "@/components/ProductReviews";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductoDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [quantity, setQuantity] = React.useState(1);
  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchProductBySlug(slug)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useSeo(
    product ? `${product.name} · Malatrasi WoodWorks` : "Produto · Malatrasi WoodWorks",
    product?.description ??
      "Conheça este produto da Malatrasi WoodWorks, marcenaria artesanal em madeira maciça.",
  );

  if (loading) {
    return (
      <p className="py-24 text-center text-text-muted">Carregando produto...</p>
    );
  }

  if (!product) {
    return <Navigate to="/produtos" replace />;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <nav className="mb-6 text-sm text-text-muted">
        <Link to="/produtos" className="hover:text-accent">
          Produtos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImageCarousel
          images={product.images}
          alt={product.name}
          className="aspect-square min-w-0 w-full overflow-hidden rounded-brand bg-bg-muted"
        />

        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">
            {product.category}
          </span>
          <h1 className="mt-2 font-heading text-3xl font-bold text-primary">
            {product.name}
          </h1>
          <p className="mt-4 font-heading text-2xl font-bold text-primary">
            {product.isCustomOrder ? "Sob orçamento" : currency.format(product.price)}
          </p>
          <p className="mt-4 text-text-muted">{product.description}</p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-text-muted">
            <span className="flex items-center gap-1 rounded-full bg-bg-muted px-3 py-1.5">
              <Hammer className="size-3.5" /> Feito à mão
            </span>
            {product.woodType && (
              <span className="flex items-center gap-1 rounded-full bg-bg-muted px-3 py-1.5">
                <Ruler className="size-3.5" /> {product.woodType}
              </span>
            )}
          </div>

          {product.isCustomOrder ? (
            <div className="mt-6">
              <Button asChild size="lg" variant="accent" className="w-full sm:w-auto">
                <Link to={`/orcamento?produto=${product.slug}`}>
                  Solicitar orçamento
                </Link>
              </Button>
              <p className="mt-2 text-sm text-text-muted">
                Peça sob encomenda — conte as medidas, a madeira e o
                acabamento desejados e enviamos um orçamento sem compromisso.
              </p>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center self-start rounded-brand border border-black/10">
                <button
                  type="button"
                  aria-label="Diminuir"
                  className="flex size-11 items-center justify-center text-primary disabled:opacity-40"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar"
                  className="flex size-11 items-center justify-center text-primary"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <Button
                size="lg"
                variant="accent"
                className="flex-1"
                onClick={() => {
                  if (addItem(product, quantity)) {
                    showToast("Produto adicionado ao carrinho", product.name);
                  }
                }}
              >
                Adicionar ao carrinho
              </Button>
            </div>
          )}

          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-black/10 pt-6 text-center text-xs text-text-muted">
            <div className="flex flex-col items-center gap-1.5">
              <Hammer className="size-5 text-accent" />
              Feito à mão
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck className="size-5 text-accent" />
              Compra segura
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Ruler className="size-5 text-accent" />
              Sob medida
            </div>
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />
    </section>
  );
}

import * as React from "react";
import { useSeo } from "@/hooks/use-seo";
import { useProducts } from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ProductGrid } from "@/components/ProductGrid";
import { CombosSection } from "@/components/CombosSection";
import { PromoSection } from "@/components/PromoSection";
import { ALL_CATEGORIES_FILTER, PROMO_FILTER, type FilterCategory } from "@/data/products";

export function Productos() {
  useSeo(
    "Produtos · Malatrasi WoodWorks",
    "Explore o catálogo da Malatrasi WoodWorks: mesas, bancos, utilidades e peças sob encomenda em madeira maciça.",
  );
  const [category, setCategory] = React.useState<FilterCategory>(ALL_CATEGORIES_FILTER);
  const { products, loading, error } = useProducts();
  const categories = useCategories();

  const promoProducts = products.filter((p) => p.promoPrice != null);
  const filtered = products.filter((p) =>
    category === ALL_CATEGORIES_FILTER
      ? true
      : category === PROMO_FILTER
        ? p.promoPrice != null
        : p.category === category,
  );

  return (
    <>
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
        Todos os produtos
      </h1>
      <p className="mt-2 text-text-muted">
        {loading
          ? "Carregando..."
          : `${filtered.length} ${filtered.length === 1 ? "produto" : "produtos"}`}
      </p>

      <div className="my-8">
        <CategoryFilter
          categories={categories.map((c) => c.name)}
          hasPromo={promoProducts.length > 0}
          value={category}
          onChange={setCategory}
        />
      </div>

      {loading ? (
        <p className="py-16 text-center text-text-muted">Carregando produtos...</p>
      ) : error ? (
        <p className="py-16 text-center text-accent">{error}</p>
      ) : (
        <>
          {category === ALL_CATEGORIES_FILTER && (
            <PromoSection products={promoProducts} className="mb-12" />
          )}
          <ProductGrid products={filtered} />
        </>
      )}
    </section>
    <CombosSection />
    </>
  );
}

import * as React from "react";
import { Link } from "react-router-dom";
import { useSeo } from "@/hooks/use-seo";
import { useProducts } from "@/hooks/use-products";
import { Hero } from "@/components/Hero";
import { BenefitCards } from "@/components/TrustBadges";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ProductGrid } from "@/components/ProductGrid";
import { ReviewsSection } from "@/components/ReviewsSection";
import { AboutSection } from "@/components/AboutSection";
import { ContactSection } from "@/components/ContactSection";
import { Reveal } from "@/components/Reveal";
import { CATEGORY_TO_FILTER, type FilterCategory } from "@/data/products";

export function Home() {
  useSeo(
    "Malatrasi WoodWorks · Marcenaria artesanal sob medida",
    "Móveis e peças de madeira maciça, prontos ou sob encomenda. Acompanhe seu pedido do início à entrega.",
  );
  const [category, setCategory] = React.useState<FilterCategory>("Todos");
  const { products, loading, error } = useProducts();

  // A home só mostra a "vitrine": produtos marcados como destaque no admin,
  // não o catálogo completo (isso é /produtos).
  const featuredProducts = products.filter((p) => p.featured);
  const filtered = featuredProducts.filter(
    (p) => category === "Todos" || CATEGORY_TO_FILTER[p.category] === category,
  );

  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <Reveal>
          <BenefitCards />
        </Reveal>
      </section>

      <section id="destaques" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-heading text-3xl font-bold text-primary">
              Destaques
            </h2>
            <Link
              to="/produtos"
              className="text-sm font-semibold text-accent hover:underline"
            >
              Ver todos →
            </Link>
          </div>

          <div className="mb-8">
            <CategoryFilter value={category} onChange={setCategory} />
          </div>

          {loading ? (
            <p className="py-16 text-center text-text-muted">Carregando produtos...</p>
          ) : error ? (
            <p className="py-16 text-center text-accent">{error}</p>
          ) : (
            <ProductGrid products={filtered} />
          )}
        </Reveal>
      </section>

      <Reveal>
        <ReviewsSection />
      </Reveal>
      <Reveal>
        <AboutSection />
      </Reveal>
      <Reveal>
        <ContactSection />
      </Reveal>
    </>
  );
}

import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { usePublicReviews } from "@/hooks/use-public-reviews";
import type { PublicReview } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";

function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <Card data-review-card className="w-[280px] shrink-0 snap-start sm:w-[320px]">
      <CardContent className="p-5">
        {review.product && (
          <Link
            to={`/produto/${review.product.slug}`}
            className="font-heading text-sm font-semibold text-primary hover:text-accent"
          >
            {review.product.name}
          </Link>
        )}
        <div className="mt-2 flex gap-1 text-accent">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-4" fill={i < review.rating ? "currentColor" : "none"} />
          ))}
        </div>
        <p className="mt-3 line-clamp-4 text-sm text-text">{review.comment}</p>
        {(review.customer_name || review.customer_city || review.customer_country) && (
          <p className="mt-3 text-xs font-medium text-text-muted">
            {[review.customer_name, review.customer_city, review.customer_country]
              .filter(Boolean)
              .join(" - ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewCardSkeleton() {
  return (
    <Card data-review-card className="w-[280px] shrink-0 snap-start sm:w-[320px]">
      <CardContent className="animate-pulse space-y-3 p-5">
        <div className="h-4 w-24 rounded bg-bg-muted" />
        <div className="h-3 w-full rounded bg-bg-muted" />
        <div className="h-3 w-3/4 rounded bg-bg-muted" />
      </CardContent>
    </Card>
  );
}

export function ReviewsSection() {
  const { reviews, loading } = usePublicReviews();
  const trackRef = React.useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-review-card]");
    const amount = (card?.offsetWidth ?? 280) + 20;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold text-primary">
          Avaliações de clientes
        </h2>
      </div>

      {!loading && reviews.length === 0 ? (
        <Card className="mx-auto mt-8 max-w-xl">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex gap-1 text-black/10">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-5" />
              ))}
            </div>
            <p className="font-heading text-lg font-semibold text-primary">
              Ainda sem avaliações
            </p>
            <p className="text-sm text-text-muted">
              Estamos reunindo as primeiras avaliações verificadas dos nossos
              clientes. Quando existirem avaliações reais, elas aparecerão
              aqui, com nome e cidade.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative mt-8">
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <ReviewCardSkeleton key={i} />)
              : reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>

          {!loading && reviews.length > 1 && (
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                aria-label="Avaliações anteriores"
                onClick={() => scrollByCard(-1)}
                className="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white text-primary hover:bg-bg-muted"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Próximas avaliações"
                onClick={() => scrollByCard(1)}
                className="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white text-primary hover:bg-bg-muted"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

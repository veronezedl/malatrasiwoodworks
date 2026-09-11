import * as React from "react";
import { Star } from "lucide-react";
import { fetchProductReviews, type ProductReviewSummary } from "@/lib/api/reviews";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

function Stars({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5 text-accent">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={size} fill={i < Math.round(rating) ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const [summary, setSummary] = React.useState<ProductReviewSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductReviews(productId).then((data) => {
      if (!cancelled) {
        setSummary(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <section className="mt-14 border-t border-black/10 pt-10">
        <p className="text-sm text-text-muted">Carregando avaliações...</p>
      </section>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <section className="mt-14 border-t border-black/10 pt-10">
        <h2 className="font-heading text-xl font-bold text-primary">Avaliações</h2>
        <p className="mt-2 text-sm text-text-muted">
          Este produto ainda não tem avaliações. Seja o primeiro a compartilhar
          sua opinião depois de receber seu pedido.
        </p>
      </section>
    );
  }

  const { reviews, average, total, distribution } = summary;

  return (
    <section className="mt-14 border-t border-black/10 pt-10">
      <h2 className="font-heading text-xl font-bold text-primary">Avaliações</h2>

      <div className="mt-5 flex flex-col gap-8 sm:flex-row">
        <div className="flex shrink-0 flex-col items-center gap-1 sm:w-40">
          <p className="font-heading text-4xl font-bold text-primary">
            {average.toFixed(1)}
          </p>
          <Stars rating={average} size="size-5" />
          <p className="text-xs text-text-muted">
            {total} {total === 1 ? "avaliação" : "avaliações"}
          </p>
        </div>

        <div className="flex-1 space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = distribution[star];
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs text-text-muted">
                <span className="w-10 shrink-0">{star} ★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 divide-y divide-black/10">
        {reviews.map((review) => (
          <div key={review.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars rating={review.rating} />
              <span className="text-xs text-text-muted">
                {dateFmt.format(new Date(review.created_at))}
              </span>
            </div>
            {review.comment && <p className="mt-2 text-sm text-text">{review.comment}</p>}
            <p className="mt-1.5 text-xs font-medium text-text-muted">
              {review.customer_name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

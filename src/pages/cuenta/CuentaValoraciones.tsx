import * as React from "react";
import { ChevronDown, Star } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import {
  createReview,
  fetchReviewableItems,
  listMyReviews,
  type ReviewableItem,
} from "@/lib/api/reviews";
import type { DbProductReview } from "@/types/database";
import type { CuentaContext } from "@/components/customer/CuentaLayout";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrelas`}
          onClick={() => onChange(n)}
          className="text-accent"
        >
          <Star className="size-6" fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function ReviewRow({
  item,
  onSubmitted,
}: {
  item: ReviewableItem;
  onSubmitted: () => void;
}) {
  const { customer } = useOutletContext<CuentaContext>();
  const { showToast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createReview({
        customerId: customer.id,
        customerName: customer.full_name ?? "Cliente",
        customerCity: customer.city,
        customerCountry: "Brasil",
        productId: item.productId,
        orderId: item.orderId,
        rating,
        comment,
      });
      showToast("Avaliação enviada", "Obrigado por compartilhar sua opinião.");
      onSubmitted();
    } catch (err) {
      showToast(
        "Não foi possível enviar",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left text-sm hover:bg-bg-muted"
      >
        <div className="flex items-center gap-3">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="size-12 shrink-0 rounded-brand object-cover"
            />
          )}
          <div>
            <p className="font-semibold text-primary">{item.productName}</p>
            <p className="text-xs text-text-muted">Pedido {item.orderNumber}</p>
          </div>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-black/10 p-4">
          <StarPicker value={rating} onChange={setRating} />
          <Textarea
            className="mt-2"
            rows={2}
            placeholder="Conte o que você achou (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button
            size="sm"
            variant="accent"
            className="mt-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function CuentaValoraciones() {
  useSeo(
    "Avaliações · Malatrasi WoodWorks",
    "Avalie os produtos que você comprou na Malatrasi WoodWorks.",
  );
  const { customer } = useOutletContext<CuentaContext>();
  const [reviewable, setReviewable] = React.useState<ReviewableItem[]>([]);
  const [reviews, setReviews] = React.useState<DbProductReview[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [reviewableData, reviewsData] = await Promise.all([
        fetchReviewableItems(customer.id),
        listMyReviews(customer.id),
      ]);
      setReviewable(reviewableData);
      setReviews(reviewsData);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Não foi possível carregar as informações.",
      );
    } finally {
      setLoading(false);
    }
  }, [customer.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">
        Avaliações
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        Compartilhe sua opinião sobre os produtos que você recebeu.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-text-muted">Carregando...</p>
      ) : loadError ? (
        <p className="mt-4 text-sm text-accent">{loadError}</p>
      ) : (
        <>
          <div
            className={
              reviewable.length > 0
                ? "mt-6 rounded-brand border border-accent/30 bg-accent/5 p-4"
                : "mt-6"
            }
          >
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-semibold text-primary">
                Pendentes de avaliar
              </h2>
              {reviewable.length > 0 && (
                <Badge variant="accent">{reviewable.length}</Badge>
              )}
            </div>
            {reviewable.length === 0 ? (
              <p className="mt-3 text-sm text-text-muted">
                Você não tem produtos entregues pendentes de avaliação.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-black/10 rounded-brand border border-black/10 bg-white">
                {reviewable.map((item) => (
                  <ReviewRow key={item.productId} item={item} onSubmitted={load} />
                ))}
              </div>
            )}
          </div>

          <h2 className="mt-8 font-heading text-lg font-semibold text-primary">
            Suas avaliações
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">
              Você ainda não avaliou nenhum produto.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-black/10 rounded-brand border border-black/10 bg-white">
              {reviews.map((r) => (
                <div key={r.id} className="p-4 text-sm">
                  <div className="flex gap-1 text-accent">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="size-4"
                        fill={i < r.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  {r.comment && <p className="mt-2 text-text">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

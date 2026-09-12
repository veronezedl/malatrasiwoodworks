import * as React from "react";
import type { PublicReview } from "@/types/database";
import { fetchPublicReviews } from "@/lib/api/reviews";

export function usePublicReviews(limit = 12) {
  const [reviews, setReviews] = React.useState<PublicReview[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetchPublicReviews(limit)
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        // Best-effort: se falhar (ex. bloqueio de rede do navegador), a
        // seção de avaliações simplesmente mostra o estado vazio.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { reviews, loading };
}

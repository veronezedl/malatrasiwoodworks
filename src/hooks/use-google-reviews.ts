import * as React from "react";
import { fetchGoogleReviews, type GoogleReviewsData } from "@/lib/api/googleReviews";

export function useGoogleReviews() {
  const [data, setData] = React.useState<GoogleReviewsData | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchGoogleReviews()
      .then((result) => {
        if (!cancelled && result.configured) setData(result);
      })
      .catch(() => {
        // Best-effort: sem o Google, a seção mostra só as avaliações do site.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

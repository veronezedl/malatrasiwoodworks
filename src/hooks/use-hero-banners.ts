import * as React from "react";
import type { DbHeroBanner } from "@/types/database";
import { listActiveHeroBanners } from "@/lib/api/heroBanners";

export function useHeroBanners() {
  const [banners, setBanners] = React.useState<DbHeroBanner[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    listActiveHeroBanners()
      .then((data) => {
        if (!cancelled) setBanners(data);
      })
      .catch(() => {
        // Best-effort: sem banners o hero fica só com o texto, como antes.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return banners;
}

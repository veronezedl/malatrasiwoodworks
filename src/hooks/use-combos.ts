import * as React from "react";
import type { ComboWithItems } from "@/types/database";
import { listActiveCombos } from "@/lib/api/combos";

export function useCombos() {
  const [combos, setCombos] = React.useState<ComboWithItems[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    listActiveCombos()
      .then((data) => {
        if (!cancelled) setCombos(data);
      })
      .catch(() => {
        // Best-effort: a seção some se falhar (ver CombosSection).
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { combos, loading };
}

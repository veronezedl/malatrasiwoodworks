import * as React from "react";
import type { DbCategory } from "@/types/database";
import { listActiveCategories } from "@/lib/api/categories";

export function useCategories() {
  const [categories, setCategories] = React.useState<DbCategory[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    listActiveCategories()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}

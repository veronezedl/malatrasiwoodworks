import * as React from "react";
import type { DbGalleryPhoto } from "@/types/database";
import { listActiveGalleryPhotos } from "@/lib/api/gallery";

export function useCustomerGallery() {
  const [photos, setPhotos] = React.useState<DbGalleryPhoto[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    listActiveGalleryPhotos()
      .then((data) => {
        if (!cancelled) setPhotos(data);
      })
      .catch(() => {
        // Best-effort: a seção some se falhar (ver CustomerGallerySection).
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { photos, loading };
}

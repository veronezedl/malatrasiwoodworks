import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCustomerGallery } from "@/hooks/use-customer-gallery";
import type { DbGalleryPhoto } from "@/types/database";

function GalleryCard({ photo }: { photo: DbGalleryPhoto }) {
  return (
    <figure
      data-gallery-card
      className="w-[220px] shrink-0 snap-start overflow-hidden rounded-brand border border-black/10 bg-white sm:w-[260px]"
    >
      <img
        src={photo.image_url}
        alt={photo.caption ?? "Cliente satisfeito da Malatrasi WoodWorks"}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
      {photo.caption && (
        <figcaption className="p-3 text-xs text-text-muted">{photo.caption}</figcaption>
      )}
    </figure>
  );
}

// Galeria de fotos de clientes satisfeitos, cadastradas pelo admin (prova
// social). Diferente de <ReviewsSection>, não mostra estado vazio — é
// conteúdo decorativo, então enquanto não houver foto ativa a seção
// simplesmente não aparece na home.
export function CustomerGallerySection() {
  const { photos, loading } = useCustomerGallery();
  const trackRef = React.useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-gallery-card]");
    const amount = (card?.offsetWidth ?? 220) + 20;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  if (!loading && photos.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold text-primary">
          Clientes satisfeitos
        </h2>
        <p className="mt-2 text-text-muted">
          Peças entregues, feitas à mão para quem confiou na Malatrasi WoodWorks.
        </p>
      </div>

      <div className="relative mt-8">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((photo) => (
            <GalleryCard key={photo.id} photo={photo} />
          ))}
        </div>

        {photos.length > 1 && (
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              aria-label="Fotos anteriores"
              onClick={() => scrollByCard(-1)}
              className="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white text-primary hover:bg-bg-muted"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Próximas fotos"
              onClick={() => scrollByCard(1)}
              className="flex size-9 items-center justify-center rounded-full border border-black/10 bg-white text-primary hover:bg-bg-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

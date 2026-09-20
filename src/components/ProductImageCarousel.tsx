import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

// Carrossel simples pra até 2 imagens por produto — sem lib nova, só um
// índice em estado. Com 1 imagem só (caso comum hoje, até o admin subir a
// 2ª foto de cada produto), não renderiza nenhum controle.
export function ProductImageCarousel({
  images,
  alt,
  className,
}: ProductImageCarouselProps) {
  const [index, setIndex] = React.useState(0);
  const safeImages = images.length > 0 ? images : [""];
  const hasMultiple = safeImages.length > 1;

  function go(e: React.MouseEvent, direction: 1 | -1) {
    // As chamadoras (ex.: ProductCard) colocam a imagem inteira dentro de um
    // botão que abre o quick-view — sem isso, clicar na seta também
    // dispararia esse clique.
    e.stopPropagation();
    e.preventDefault();
    setIndex((i) => (i + direction + safeImages.length) % safeImages.length);
  }

  return (
    <div className={cn("relative", className)}>
      <img src={safeImages[index]} alt={alt} className="h-full w-full object-cover" />

      {hasMultiple && (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={(e) => go(e, -1)}
            className="absolute left-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm transition-colors hover:bg-white"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={(e) => go(e, 1)}
            className="absolute right-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-primary shadow-sm transition-colors hover:bg-white"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {safeImages.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full",
                  i === index ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

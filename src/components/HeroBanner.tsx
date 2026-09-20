import * as React from "react";
import type { DbHeroBanner } from "@/types/database";

// Imagens do banner da home cadastradas pelo admin. Com mais de uma, alterna
// sozinho (fade) no intervalo configurado e mostra indicadores; respeita quem prefere menos
// movimento.
export function HeroBanner({
  banners,
  intervalSeconds = 5,
  opacity = 100,
  className = "",
}: {
  banners: DbHeroBanner[];
  intervalSeconds?: number;
  opacity?: number;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const count = banners.length;

  React.useEffect(() => {
    if (count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      Math.max(2, intervalSeconds) * 1000,
    );
    return () => window.clearInterval(timer);
  }, [count, intervalSeconds]);

  if (count === 0) return null;
  const current = index % count;

  return (
    <div
      className={`relative overflow-hidden rounded-brand border border-white/10 bg-black/20 ${className}`}
    >
      {banners.map((banner, i) => (
        <img
          key={banner.id}
          src={banner.image_url}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          style={{ opacity: i === current ? Math.min(100, Math.max(10, opacity)) / 100 : 0 }}
          className="absolute inset-0 size-full object-cover transition-opacity duration-700"
        />
      ))}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Mostrar imagem ${i + 1}`}
              aria-current={i === current}
              onClick={() => setIndex(i)}
              className={`size-2 rounded-full transition-colors ${
                i === current ? "bg-accent" : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

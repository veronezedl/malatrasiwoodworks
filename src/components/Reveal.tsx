import * as React from "react";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

// Envuelve una sección para que aparezca con un fade + leve desplazamiento
// hacia arriba recién cuando entra en el viewport, en vez de estar ya
// renderizada de golpe al cargar la página.
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref}
      style={inView && delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(className, inView ? "animate-fade-slide-up" : "opacity-0")}
    >
      {children}
    </div>
  );
}

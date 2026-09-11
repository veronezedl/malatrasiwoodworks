import * as React from "react";
import { useLocation } from "react-router-dom";

// Un fade + leve deslizamiento hacia arriba en cada cambio de ruta, para que
// la transición entre páginas se sienta suave en vez de un corte brusco.
// La key por pathname fuerza a React a re-montar y re-disparar la animación.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}

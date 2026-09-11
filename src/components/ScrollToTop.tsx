import * as React from "react";
import { useLocation } from "react-router-dom";

// Sin esto, React Router mantiene la posición de scroll entre páginas —
// el cliente terminaba una página a mitad de scroll y la siguiente
// aparecía igual de desplazada, en vez de arrancar arriba.
export function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

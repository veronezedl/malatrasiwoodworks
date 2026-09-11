import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrustStrip } from "@/components/TrustBadges";

export function Hero() {
  return (
    <section className="bg-bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <Badge variant="accent" className="mb-5">
          Peças prontas ou sob encomenda
        </Badge>
        <h1 className="max-w-3xl font-heading text-4xl font-bold leading-tight text-primary sm:text-5xl">
          Móveis e peças em madeira, feitos para durar.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-text-muted sm:text-lg">
          Marcenaria artesanal: do catálogo pronto à peça sob medida, com
          acompanhamento do seu pedido do início à entrega.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="accent">
            <Link to="/produtos">Ver produtos</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/orcamento">Pedir orçamento sob medida</Link>
          </Button>
        </div>

        <div className="mt-10">
          <TrustStrip />
        </div>
      </div>
    </section>
  );
}

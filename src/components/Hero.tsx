import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoFullUrl from "@/assets/logo-full.png";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary">
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-primary/40" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <img
          src={logoFullUrl}
          alt=""
          aria-hidden="true"
          className="mb-10 h-16 w-auto object-contain opacity-90 sm:h-20"
        />

        <h1 className="max-w-2xl font-heading text-4xl font-semibold leading-tight text-white sm:text-6xl">
          Da madeira bruta à{" "}
          <span className="italic text-accent">obra de arte</span>.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
          Tábuas, mesas e aparadores em madeiras nobres nativas. Cada peça é
          única — feita à mão em Bauru-SP, com gravação a laser disponível.
        </p>

        <div className="mt-9 flex flex-wrap gap-4">
          <Button asChild size="lg" variant="accent" className="rounded-none">
            <Link to="/produtos">Ver produtos</Link>
          </Button>
          <Button asChild size="lg" variant="outline-light" className="rounded-none">
            <Link to="/orcamento">Pedir orçamento</Link>
          </Button>
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs uppercase tracking-widest2 text-white/50">
          <a
            href="https://www.instagram.com/malatrasi_woodworks/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent"
          >
            @malatrasi_woodworks
          </a>
          <a href="tel:+5515991288556" className="hover:text-accent">
            (15) 99128-8556
          </a>
          <span>Bauru · SP · Brasil</span>
        </div>
      </div>
    </section>
  );
}

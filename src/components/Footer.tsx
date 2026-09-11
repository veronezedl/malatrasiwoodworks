import { Link } from "react-router-dom";
import { ShieldCheck, Hammer, Headset, Ruler } from "lucide-react";
import logoUrl from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoUrl}
              alt="Malatrasi WoodWorks"
              className="h-9 w-9 object-contain"
              width={36}
              height={36}
            />
            <span className="font-heading text-base font-bold">
              Malatrasi <span className="text-accent">WoodWorks</span>
            </span>
          </Link>
          <p className="mt-4 text-sm text-white/70">
            Marcenaria artesanal: móveis e peças em madeira maciça, prontos
            ou sob encomenda.
          </p>
        </div>

        <div>
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-white/90">
            Loja
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              <Link to="/produtos" className="hover:text-white">
                Produtos
              </Link>
            </li>
            <li>
              <Link to="/orcamento" className="hover:text-white">
                Orçamento sob medida
              </Link>
            </li>
            <li>
              <Link to="/sobre-nos" className="hover:text-white">
                Sobre nós
              </Link>
            </li>
            <li>
              <Link to="/contato" className="hover:text-white">
                Contato
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-white/90">
            Legal
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              <Link to="/privacidade" className="hover:text-white">
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link to="/termos" className="hover:text-white">
                Termos e condições
              </Link>
            </li>
            <li>
              <Link to="/devolucoes" className="hover:text-white">
                Trocas e devoluções
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-sm font-semibold uppercase tracking-wide text-white/90">
            Confiança
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-accent" /> Compra 100% segura
            </li>
            <li className="flex items-center gap-2">
              <Hammer className="size-4 text-accent" /> Feito à mão, sob medida
            </li>
            <li className="flex items-center gap-2">
              <Headset className="size-4 text-accent" /> Atendimento próximo
            </li>
            <li className="flex items-center gap-2">
              <Ruler className="size-4 text-accent" /> Orçamento sem compromisso
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-white/60 sm:flex-row">
          <span>© 2026 Malatrasi WoodWorks. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import logoUrl from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="Malatrasi WoodWorks"
              className="h-9 w-9 object-contain"
              width={36}
              height={36}
            />
            <span className="font-heading text-base font-semibold">
              Malatrasi <span className="italic text-accent">WoodWorks</span>
            </span>
          </Link>
          <p className="mt-4 text-sm text-white/60">
            Da madeira bruta à obra de arte. Marcenaria artesanal em madeiras
            nobres nativas, feita à mão em Bauru-SP.
          </p>
        </div>

        <div>
          <h4 className="font-heading text-xs font-semibold uppercase tracking-widest2 text-white/90">
            Loja
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li>
              <Link to="/produtos" className="hover:text-accent">
                Produtos
              </Link>
            </li>
            <li>
              <Link to="/orcamento" className="hover:text-accent">
                Orçamento sob medida
              </Link>
            </li>
            <li>
              <Link to="/sobre-nos" className="hover:text-accent">
                Sobre nós
              </Link>
            </li>
            <li>
              <Link to="/contato" className="hover:text-accent">
                Contato
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-xs font-semibold uppercase tracking-widest2 text-white/90">
            Legal
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li>
              <Link to="/privacidade" className="hover:text-accent">
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link to="/termos" className="hover:text-accent">
                Termos e condições
              </Link>
            </li>
            <li>
              <Link to="/devolucoes" className="hover:text-accent">
                Trocas e devoluções
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-heading text-xs font-semibold uppercase tracking-widest2 text-white/90">
            Contato
          </h4>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li>
              <a
                href="https://www.instagram.com/malatrasi_woodworks/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent"
              >
                @malatrasi_woodworks
              </a>
            </li>
            <li>
              <a href="tel:+5515991288556" className="hover:text-accent">
                (15) 99128-8556
              </a>
            </li>
            <li>Bauru · SP · Brasil</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-white/50 sm:flex-row">
          <span>© 2026 Malatrasi WoodWorks. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}

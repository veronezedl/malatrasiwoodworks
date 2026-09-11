import * as React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, User, ShoppingCart } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoginForm } from "@/components/LoginForm";
import { RegistroForm } from "@/components/RegistroForm";
import { PromoBanner } from "@/components/PromoBanner";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import logoUrl from "@/assets/logo.png";

const NAV_LINKS = [
  { label: "Início", to: "/" },
  { label: "Produtos", to: "/produtos" },
  { label: "Sob encomenda", to: "/orcamento" },
  { label: "Sobre nós", to: "/sobre-nos" },
  { label: "Contato", to: "/contato" },
];

function NavItem({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors hover:text-accent ${
          isActive ? "text-accent" : "text-primary"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export function Header() {
  const { itemCount } = useCart();
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();
  const accountTo = !session ? "/login" : role === "admin" ? "/admin" : "/conta";
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"login" | "registro">("login");
  const pendingRedirectRef = React.useRef(false);

  function openLoginDialog() {
    setAuthMode("login");
    setLoginDialogOpen(true);
  }

  // Após entrar pelo popup, espera "role" terminar de carregar (loading
  // inclui roleLoading em useAuth) antes de decidir o destino — igual à
  // página /login — para não mandar um admin para /conta por ler o papel
  // antes de ele ser resolvido.
  React.useEffect(() => {
    if (pendingRedirectRef.current && session && !loading) {
      pendingRedirectRef.current = false;
      setLoginDialogOpen(false);
      navigate(role === "admin" ? "/admin" : "/conta");
    }
  }, [session, role, loading, navigate]);

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm">
      <PromoBanner />

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="Malatrasi WoodWorks"
            className="h-10 w-10 object-contain"
            width={40}
            height={40}
          />
          <span className="font-heading text-lg font-bold text-primary">
            Malatrasi <span className="text-accent">WoodWorks</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <NavItem key={link.to} to={link.to} label={link.label} />
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {session ? (
            <Link to={accountTo}>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                aria-label="Minha conta"
              >
                <User />
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              aria-label="Minha conta"
              onClick={openLoginDialog}
            >
              <User />
            </Button>
          )}
          <Link to="/carrinho" className="relative">
            <Button variant="ghost" size="icon" aria-label="Carrinho">
              <ShoppingCart />
            </Button>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menu"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-5 pt-4">
                {NAV_LINKS.map((link) => (
                  <NavItem
                    key={link.to}
                    to={link.to}
                    label={link.label}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
                {session ? (
                  <NavItem
                    to={accountTo}
                    onClick={() => setMobileMenuOpen(false)}
                    label={role === "admin" ? "Painel de administração" : "Minha conta"}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openLoginDialog();
                    }}
                    className="text-left text-sm font-medium text-primary transition-colors hover:text-accent"
                  >
                    Entrar
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {authMode === "login" ? "Entrar" : "Crie sua conta"}
            </DialogTitle>
          </DialogHeader>
          {authMode === "login" ? (
            <LoginForm
              idPrefix="header-login"
              onCreateAccount={() => setAuthMode("registro")}
              onSuccess={() => {
                pendingRedirectRef.current = true;
              }}
            />
          ) : (
            <RegistroForm
              idPrefix="header-registro"
              onSuccess={() => setLoginDialogOpen(false)}
              onLoginClick={() => setAuthMode("login")}
            />
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
}

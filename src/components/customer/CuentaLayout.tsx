import * as React from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  LifeBuoy,
  Star,
  LogOut,
  ShoppingBag,
  UserCircle,
  Ruler,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchMyCustomer } from "@/lib/api/customers";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";
import type { DbCustomer } from "@/types/database";

export interface CuentaContext {
  customer: DbCustomer;
  refreshCustomer: () => Promise<void>;
}

const NAV = [
  { to: "/conta", label: "Resumo", icon: LayoutDashboard, end: true },
  { to: "/conta/pedidos", label: "Meus pedidos", icon: Package, end: false },
  { to: "/conta/orcamentos", label: "Meus orçamentos", icon: Ruler, end: false },
  { to: "/conta/perfil", label: "Meu perfil", icon: UserCircle, end: false },
  { to: "/conta/suporte", label: "Suporte", icon: LifeBuoy, end: false },
  { to: "/conta/avaliacoes", label: "Avaliações", icon: Star, end: false },
];

export function CuentaLayout() {
  const { session, role, loading, signOut } = useAuth();
  const location = useLocation();
  const [customer, setCustomer] = React.useState<DbCustomer | null>(null);
  const [loadedForUserId, setLoadedForUserId] = React.useState<string | null>(null);
  const userId = session?.user.id ?? null;

  // O userId já mudou, mas o efeito abaixo ainda não rodou para ele — é
  // tratado como "carregando" no mesmo render (não só no próximo), evitando
  // redirecionar para /cadastro com dados de um usuário anterior/vazios.
  const customerPending = userId !== null && loadedForUserId !== userId;

  React.useEffect(() => {
    if (!userId) {
      setCustomer(null);
      setLoadedForUserId(null);
      return;
    }
    let cancelled = false;
    fetchMyCustomer(userId).then((data) => {
      if (cancelled) return;
      setCustomer(data);
      setLoadedForUserId(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Permite que páginas filhas (ex. Meu perfil) recarreguem os dados do
  // cliente depois de salvar alterações, para a barra lateral (nome, foto)
  // atualizar sem recarregar a página inteira.
  const refreshCustomer = React.useCallback(async () => {
    if (!userId) return;
    const data = await fetchMyCustomer(userId);
    setCustomer(data);
  }, [userId]);

  if (loading || customerPending) {
    return (
      <p className="mx-auto max-w-7xl px-4 py-20 text-center text-text-muted">
        Carregando...
      </p>
    );
  }

  if (!session) {
    return (
      <Navigate to="/login" state={{ from: location.pathname }} replace />
    );
  }

  if (!customer) {
    // Uma sessão de admin sem ficha de cliente não deve cair no cadastro —
    // isso é só para visitantes que ainda não têm conta.
    return <Navigate to={role === "admin" ? "/admin" : "/cadastro"} replace />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-56 shrink-0">
          <div className="flex items-center gap-3 rounded-brand border border-black/10 bg-white p-4">
            {customer.avatar_url ? (
              <img
                src={customer.avatar_url}
                alt={customer.full_name ?? ""}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-muted">
                <UserCircle className="size-6 text-text-muted" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-primary">
                {customer.full_name}
              </p>
              <p className="truncate text-xs text-text-muted">{customer.email}</p>
            </div>
          </div>

          <Button asChild variant="accent" className="mt-4 w-full">
            <Link to="/produtos">
              <ShoppingBag className="size-4" />
              Novo pedido
            </Link>
          </Button>

          <nav className="mt-4 flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 whitespace-nowrap rounded-brand px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-text-muted hover:bg-bg-muted hover:text-primary"
                  }`
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-3 whitespace-nowrap rounded-brand px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-bg-muted hover:text-accent"
            >
              <LogOut className="size-4" />
              Sair
            </button>
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <PageTransition>
            <Outlet context={{ customer, refreshCustomer } satisfies CuentaContext} />
          </PageTransition>
        </div>
      </div>
    </div>
  );
}

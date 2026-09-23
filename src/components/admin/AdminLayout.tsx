import * as React from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Truck,
  Megaphone,
  Ruler,
  UserCog,
  LogOut,
  Menu,
  GripHorizontal,
  Tags,
  Images,
  PackagePlus,
  Boxes,
  LayoutTemplate,
  MapPinned,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { PageTransition } from "@/components/PageTransition";
import logoUrl from "@/assets/logo.png";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag, end: false },
  { to: "/admin/produtos", label: "Produtos", icon: Package, end: false },
  { to: "/admin/produtos/ordenar", label: "Ordenar Produtos", icon: ArrowUpDown, end: false },
  { to: "/admin/categorias", label: "Categorias", icon: Tags, end: false },
  { to: "/admin/kits", label: "Kits e Combos", icon: Boxes, end: false },
  { to: "/admin/adicionais", label: "Adicionais", icon: PackagePlus, end: false },
  { to: "/admin/clientes", label: "Clientes", icon: Users, end: false },
  { to: "/admin/orcamentos", label: "Orçamentos", icon: Ruler, end: false },
  { to: "/admin/modelos-de-alca", label: "Modelos de Alça", icon: GripHorizontal, end: false },
  { to: "/admin/entregas", label: "Entregas", icon: Truck, end: false },
  { to: "/admin/frete-por-estado", label: "Frete por Estado", icon: MapPinned, end: false },
  { to: "/admin/promocoes", label: "Promoção", icon: Megaphone, end: false },
  { to: "/admin/banners", label: "Banners da Home", icon: LayoutTemplate, end: false },
  { to: "/admin/fotos-clientes", label: "Fotos de Clientes", icon: Images, end: false },
  { to: "/admin/usuarios", label: "Usuários", icon: UserCog, end: false },
];

// Conta os pedidos "pending" (recém-chegados, ainda sem revisão) para
// mostrar como aviso ao lado de "Pedidos" — atualiza sozinho a cada pedido
// novo (Realtime) e ao voltar para a aba.
function usePendingOrdersCount() {
  const [count, setCount] = React.useState(0);

  const load = React.useCallback(async () => {
    const { count: pendingCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    setCount(pendingCount ?? 0);
  }, []);

  React.useEffect(() => {
    load();

    const channel = supabase
      .channel("admin-pending-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(),
      )
      .subscribe();

    function onFocus() {
      load();
    }
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  return count;
}

function AdminNavLinks({
  pendingCount,
  onNavigate,
}: {
  pendingCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-brand px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-white"
                : "text-text-muted hover:bg-bg-muted hover:text-primary"
            }`
          }
        >
          <Icon className="size-4" />
          <span className="flex-1">{label}</span>
          {to === "/admin/pedidos" && pendingCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const { session, role, loading, signOut } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  // Uma única inscrição Realtime para todo o layout — cada <AdminNavLinks>
  // (sidebar desktop + Sheet mobile, ambos montados ao mesmo tempo porque a
  // sidebar só se esconde via CSS) abria a sua própria com o mesmo nome de
  // canal, e o segundo subscribe() derrubava o app inteiro ao abrir o menu mobile.
  const pendingCount = usePendingOrdersCount();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Carregando...
      </div>
    );
  }

  if (!session || role !== "admin") {
    return (
      <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-muted sm:flex-row">
      <header className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="Malatrasi WoodWorks" className="size-8 object-contain" />
          <span className="font-heading text-sm font-bold text-primary">Admin</span>
        </div>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Abrir menu"
              className="rounded-brand p-2 text-primary hover:bg-bg-muted"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 max-w-[80%]">
            <SheetHeader>
              <SheetTitle>Admin</SheetTitle>
            </SheetHeader>
            <AdminNavLinks
              pendingCount={pendingCount}
              onNavigate={() => setMobileNavOpen(false)}
            />
            <SheetClose asChild>
              <button
                type="button"
                onClick={() => signOut()}
                className="mt-2 flex items-center gap-3 rounded-brand border-t border-black/10 px-3 py-2.5 pt-4 text-sm font-medium text-text-muted hover:bg-bg-muted hover:text-accent"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </header>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-black/10 bg-white p-5 sm:sticky sm:top-0 sm:flex sm:h-screen sm:overflow-y-auto">
        <div className="flex items-center gap-2 px-1">
          <img src={logoUrl} alt="Malatrasi WoodWorks" className="size-8 object-contain" />
          <span className="font-heading text-sm font-bold text-primary">
            Admin
          </span>
        </div>

        <AdminNavLinks pendingCount={pendingCount} />

        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-3 rounded-brand border-t border-black/10 px-3 py-2.5 pt-4 text-sm font-medium text-text-muted hover:bg-bg-muted hover:text-accent"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-8">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}

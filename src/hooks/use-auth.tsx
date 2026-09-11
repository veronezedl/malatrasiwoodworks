import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface AuthContextValue {
  session: Session | null;
  role: "customer" | "admin" | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [role, setRole] = React.useState<"customer" | "admin" | null>(null);
  const [initializing, setInitializing] = React.useState(true);
  const [roleLoading, setRoleLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setInitializing(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // Depende só do user id, não do objeto `session` inteiro: o Supabase
  // dispara onAuthStateChange (com uma `session` nova, mesmo usuário) toda
  // vez que a aba recupera o foco e atualiza o token. Se este efeito
  // dependesse de `session`, cada refresh voltaria a colocar `loading` em
  // true no meio da navegação — e como AdminLayout mostra uma tela de
  // "Carregando..." enquanto isso, o <Outlet /> era desmontado e remontado,
  // apagando o estado local de qualquer formulário aberto (ver ProductForm).
  React.useEffect(() => {
    if (!userId) {
      setRole(null);
      return;
    }
    setRoleLoading(true);
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setRole((data?.role as "customer" | "admin") ?? "customer");
        setRoleLoading(false);
      });
  }, [userId]);

  // Mientras no se confirma la sesión inicial, loading se mantiene true —
  // evita que un session=null transitorio (antes de que getSession()
  // resuelva) dispare una redirección prematura en las rutas protegidas.
  const loading = initializing || roleLoading;

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = React.useMemo(
    () => ({ session, role, loading, signOut }),
    [session, role, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

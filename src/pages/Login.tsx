import { Navigate, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSeo } from "@/hooks/use-seo";
import { LoginForm } from "@/components/LoginForm";

export function Login() {
  useSeo("Entrar · Malatrasi WoodWorks", "Acesse sua conta da Malatrasi WoodWorks.");
  const { session, role, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  // Se viemos de um fluxo interrompido (ex. checkout a partir do carrinho),
  // voltamos para lá em vez de sempre mandar para /conta — evita cliques a
  // mais e mantém o processo de compra contínuo.
  // Espera "role" carregar (loading inclui roleLoading) para saber se o
  // login é de admin ou de cliente antes de redirecionar.
  if (!loading && session) {
    return <Navigate to={from ?? (role === "admin" ? "/admin" : "/conta")} replace />;
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <LogIn className="size-6 text-primary" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold text-primary">
          Entrar
        </h1>
      </div>

      <div className="mt-8 rounded-brand border border-black/10 bg-white p-6">
        <LoginForm />
      </div>
    </section>
  );
}

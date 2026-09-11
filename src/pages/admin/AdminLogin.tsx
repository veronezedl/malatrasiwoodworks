import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import { useSeo } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLogin() {
  useSeo("Acesso administrador · Malatrasi WoodWorks", "Painel de administração.");
  const { session, role, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  if (!loading && session && role === "admin") {
    const from =
      (location.state as { from?: string } | null)?.from ?? "/admin/pedidos";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError("O banco de dados ainda não está configurado.");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError("Email ou senha incorretos.");
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-bg-muted px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-brand border border-black/10 bg-white p-8"
      >
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-6 text-primary" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold text-primary">
            Painel de administração
          </h1>
        </div>

        {error && (
          <div className="mt-5 rounded-brand bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="mt-6 w-full"
          disabled={submitting}
        >
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

import * as React from "react";
import { Link } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginFormProps {
  onSuccess?: () => void;
  idPrefix?: string;
  // Se informado (uso em popup), "Criar conta" troca de tela no mesmo popup
  // em vez de navegar para /cadastro.
  onCreateAccount?: () => void;
}

export function LoginForm({ onSuccess, idPrefix = "login", onCreateAccount }: LoginFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError("O login ainda não está disponível.");
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
      return;
    }
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 rounded-brand bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-email`}>Email</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${idPrefix}-password`}>Senha</Label>
            <Link
              to="/recuperar-senha"
              className="text-xs font-medium text-accent hover:underline"
            >
              Esqueceu sua senha?
            </Link>
          </div>
          <Input
            id={`${idPrefix}-password`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" className="mt-6 w-full" disabled={submitting}>
        {submitting ? "Entrando..." : "Entrar"}
      </Button>
      <p className="mt-4 text-center text-sm text-text-muted">
        Não tem conta?{" "}
        {onCreateAccount ? (
          <button
            type="button"
            onClick={onCreateAccount}
            className="font-medium text-accent hover:underline"
          >
            Criar conta
          </button>
        ) : (
          <Link to="/cadastro" className="font-medium text-accent hover:underline">
            Criar conta
          </Link>
        )}
      </p>
    </form>
  );
}

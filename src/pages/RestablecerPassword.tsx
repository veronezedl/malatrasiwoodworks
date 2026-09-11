import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { claimGuestCustomer } from "@/lib/api/customers";
import { useAuth } from "@/hooks/use-auth";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RestablecerPassword() {
  useSeo(
    "Redefinir senha · Malatrasi WoodWorks",
    "Crie uma nova senha para sua conta da Malatrasi WoodWorks.",
  );
  const { session, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setSubmitting(false);
    if (updateError) {
      setError("Não foi possível atualizar a senha. Tente novamente.");
      return;
    }
    // Se este email tinha um pré-cadastro de checkout de convidado, vincula
    // à conta recém-criada. No-op silencioso se não houver nada a
    // reivindicar (caso normal de "esqueci minha senha").
    await claimGuestCustomer().catch(() => false);
    showToast("Senha atualizada", "Agora você já pode usar sua nova senha.");
    navigate("/");
  }

  if (loading) {
    return (
      <p className="mx-auto max-w-sm px-4 py-20 text-center text-text-muted">
        Carregando...
      </p>
    );
  }

  if (!isSupabaseConfigured || !session) {
    return (
      <section className="mx-auto max-w-sm px-4 py-14 text-center sm:px-6">
        <h1 className="font-heading text-2xl font-bold text-primary">
          Link inválido ou expirado
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Solicite um novo link para redefinir sua senha.
        </p>
        <Button asChild className="mt-6">
          <Link to="/recuperar-senha">Solicitar novo link</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="size-6 text-primary" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold text-primary">
          Nova senha
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-brand border border-black/10 bg-white p-6"
      >
        {error && (
          <div className="mb-4 rounded-brand bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" className="mt-6 w-full" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar senha"}
        </Button>
      </form>
    </section>
  );
}

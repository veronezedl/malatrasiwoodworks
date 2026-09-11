import * as React from "react";
import { Link } from "react-router-dom";
import { KeyRound, MailCheck } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useSeo } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RecuperarPassword() {
  useSeo(
    "Recuperar senha · Malatrasi WoodWorks",
    "Solicite um link para redefinir sua senha da Malatrasi WoodWorks.",
  );
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError("A recuperação de senha ainda não está disponível.");
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/redefinir-senha` },
    );
    setSubmitting(false);
    if (resetError) {
      setError("Não foi possível enviar o link. Tente novamente.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <section className="mx-auto max-w-sm px-4 py-14 text-center sm:px-6">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <MailCheck className="size-6 text-primary" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold text-primary">
          Confira seu email
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Enviamos um link para <strong>{email}</strong> para você redefinir
          sua senha.
        </p>
        <Button asChild className="mt-6">
          <Link to="/login">Voltar para o login</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-sm px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="size-6 text-primary" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold text-primary">
          Recuperar senha
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Enviaremos um link para o seu email para você criar uma nova senha.
        </p>
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
        <div className="space-y-1.5">
          <Label htmlFor="recover-email">Email</Label>
          <Input
            id="recover-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="mt-6 w-full" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar link"}
        </Button>
        <p className="mt-4 text-center text-sm text-text-muted">
          <Link to="/login" className="font-medium text-accent hover:underline">
            Voltar para o login
          </Link>
        </p>
      </form>
    </section>
  );
}

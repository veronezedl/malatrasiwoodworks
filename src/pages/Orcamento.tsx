import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Ruler, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSeo } from "@/hooks/use-seo";
import { fetchMyCustomer } from "@/lib/api/customers";
import { createQuoteRequest, uploadQuoteReferenceImage } from "@/lib/api/quotes";
import { fetchProductBySlug } from "@/lib/api/catalog";
import type { DbCustomer } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/LoginForm";
import { RegistroForm } from "@/components/RegistroForm";

export function Orcamento() {
  useSeo(
    "Orçamento sob medida · Malatrasi WoodWorks",
    "Solicite um orçamento para uma peça de madeira personalizada, sem compromisso.",
  );
  const [searchParams] = useSearchParams();
  const productSlug = searchParams.get("produto");
  const { session, loading } = useAuth();

  const [customer, setCustomer] = React.useState<DbCustomer | null>(null);
  const [customerLoading, setCustomerLoading] = React.useState(true);
  const [authMode, setAuthMode] = React.useState<"login" | "registro">("login");
  const [authDialogOpen, setAuthDialogOpen] = React.useState(false);

  const [description, setDescription] = React.useState("");
  const [woodType, setWoodType] = React.useState("");
  const [dimensions, setDimensions] = React.useState("");
  const [budgetHint, setBudgetHint] = React.useState("");
  const [referenceFile, setReferenceFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!productSlug) return;
    fetchProductBySlug(productSlug).then((product) => {
      if (product) {
        setDescription(`Gostaria de um orçamento para: ${product.name}`);
        if (product.woodType) setWoodType(product.woodType);
      }
    });
  }, [productSlug]);

  React.useEffect(() => {
    if (!session) {
      setCustomer(null);
      setCustomerLoading(false);
      return;
    }
    setCustomerLoading(true);
    fetchMyCustomer(session.user.id)
      .then(setCustomer)
      .finally(() => setCustomerLoading(false));
  }, [session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setFormError(null);
    if (!description.trim()) {
      setFormError("Descreva a peça que você deseja.");
      return;
    }

    setSubmitting(true);
    try {
      let referenceImageUrl: string | null = null;
      if (referenceFile && customer.auth_user_id) {
        referenceImageUrl = await uploadQuoteReferenceImage(
          customer.auth_user_id,
          referenceFile,
        );
      }

      await createQuoteRequest({
        customerId: customer.id,
        description,
        woodType: woodType || null,
        dimensions: dimensions || null,
        referenceImageUrl,
        budgetHint: budgetHint ? Number(budgetHint) : null,
      });
      setSubmitted(true);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o pedido de orçamento. Tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="size-7 text-success" />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold text-primary">
          Pedido de orçamento enviado!
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Vamos analisar os detalhes e retornar com um valor em breve. Você
          pode acompanhar o status em "Meus orçamentos".
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="accent">
            <Link to="/conta/orcamentos">Ver meus orçamentos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/produtos">Continuar navegando</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/10">
          <Ruler className="size-6 text-accent" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-bold text-primary">
          Orçamento sob medida
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Conte pra gente a peça que você tem em mente — madeira, medidas e
          acabamento — e enviamos um orçamento sem compromisso.
        </p>
      </div>

      <div className="mt-8 rounded-brand border border-black/10 bg-white p-6 sm:p-8">
        {loading || customerLoading ? (
          <p className="text-sm text-text-muted">Carregando...</p>
        ) : !session || !customer ? (
          <div className="text-center">
            <p className="text-sm text-text-muted">
              Para solicitar um orçamento, entre ou crie sua conta — é rápido
              e usamos os mesmos dados para acompanhar seu pedido depois.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Button
                variant="accent"
                onClick={() => {
                  setAuthMode("login");
                  setAuthDialogOpen(true);
                }}
              >
                Entrar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAuthMode("registro");
                  setAuthDialogOpen(true);
                }}
              >
                Criar conta
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className="mb-5 rounded-brand bg-accent/10 px-4 py-3 text-sm font-medium text-accent">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="quote-description">Descreva a peça desejada</Label>
              <Textarea
                id="quote-description"
                rows={4}
                placeholder="Ex: uma mesa de centro retangular para a sala..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="quote-wood">Madeira desejada (opcional)</Label>
                <Input
                  id="quote-wood"
                  placeholder="Ex: Freijó, Cumaru, Pinus..."
                  value={woodType}
                  onChange={(e) => setWoodType(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quote-dimensions">Medidas aproximadas (opcional)</Label>
                <Input
                  id="quote-dimensions"
                  placeholder="Ex: 1,20m x 0,60m x 0,45m"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quote-budget">Orçamento estimado em R$ (opcional)</Label>
                <Input
                  id="quote-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetHint}
                  onChange={(e) => setBudgetHint(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quote-reference">Imagem de referência (opcional)</Label>
                <Input
                  id="quote-reference"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="mt-6 w-full"
              disabled={submitting}
            >
              {submitting ? "Enviando..." : "Solicitar orçamento"}
            </Button>
          </form>
        )}
      </div>

      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {authMode === "login" ? "Entrar" : "Crie sua conta"}
            </DialogTitle>
          </DialogHeader>
          {authMode === "login" ? (
            <LoginForm
              idPrefix="quote-login"
              onCreateAccount={() => setAuthMode("registro")}
              onSuccess={() => setAuthDialogOpen(false)}
            />
          ) : (
            <RegistroForm
              idPrefix="quote-registro"
              redirect={false}
              onSuccess={() => setAuthDialogOpen(false)}
              onLoginClick={() => setAuthMode("login")}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

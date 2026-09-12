import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Ruler, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSeo } from "@/hooks/use-seo";
import { fetchMyCustomer } from "@/lib/api/customers";
import { createQuoteRequest, uploadQuoteReferenceImage } from "@/lib/api/quotes";
import { fetchProductBySlug } from "@/lib/api/catalog";
import { PRODUCT_TYPES, calculateEstimate } from "@/lib/pricing";
import type { DbCustomer } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/LoginForm";
import { RegistroForm } from "@/components/RegistroForm";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function Orcamento() {
  useSeo(
    "Orçamento sob medida · Malatrasi WoodWorks",
    "Calcule uma estimativa e solicite um orçamento para uma peça de madeira personalizada, sem compromisso.",
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
  const [productType, setProductType] = React.useState(PRODUCT_TYPES[0].value);
  const [widthCm, setWidthCm] = React.useState("");
  const [lengthCm, setLengthCm] = React.useState("");
  const [heightCm, setHeightCm] = React.useState("");
  const [hasHandle, setHasHandle] = React.useState(false);
  const [referenceFile, setReferenceFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const estimate = calculateEstimate({
    productType,
    widthCm: Number(widthCm),
    lengthCm: Number(lengthCm),
    heightCm: heightCm ? Number(heightCm) : null,
    hasHandle,
  });

  React.useEffect(() => {
    if (!productSlug) return;
    fetchProductBySlug(productSlug)
      .then((product) => {
        if (product) {
          setDescription(`Gostaria de um orçamento para: ${product.name}`);
          if (product.woodType) setWoodType(product.woodType);
        }
      })
      .catch(() => {
        // Best-effort: sem o produto pré-preenchido, o cliente ainda pode
        // descrever a peça manualmente.
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
      .catch(() => setCustomer(null))
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

      const dimensionsSummary =
        widthCm && lengthCm
          ? `${widthCm} x ${lengthCm}${heightCm ? ` x ${heightCm}` : ""} cm${
              hasHandle ? " · com cabo/alça" : ""
            }`
          : null;

      await createQuoteRequest({
        customerId: customer.id,
        description,
        woodType: woodType || null,
        dimensions: dimensionsSummary,
        referenceImageUrl,
        productType,
        widthCm: widthCm ? Number(widthCm) : null,
        lengthCm: lengthCm ? Number(lengthCm) : null,
        heightCm: heightCm ? Number(heightCm) : null,
        hasHandle,
        estimatedPrice: estimate?.estimatedPrice ?? null,
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
          Vamos analisar os detalhes e confirmar o valor final em breve. Você
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
          Informe o tipo de peça e as medidas para ver uma estimativa na hora
          — o valor final é confirmado por nós antes de virar pedido.
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

            <h2 className="font-heading text-sm font-semibold uppercase tracking-widest2 text-text-muted">
              Calculadora
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="quote-product-type">Tipo de produto</Label>
                <Select
                  id="quote-product-type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                >
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quote-width">Largura (cm)</Label>
                <Input
                  id="quote-width"
                  type="number"
                  min="0"
                  step="0.5"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quote-length">Comprimento (cm)</Label>
                <Input
                  id="quote-length"
                  type="number"
                  min="0"
                  step="0.5"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quote-height">Altura / espessura (cm, opcional)</Label>
                <Input
                  id="quote-height"
                  type="number"
                  min="0"
                  step="0.5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    className="size-4 accent-accent"
                    checked={hasHandle}
                    onChange={(e) => setHasHandle(e.target.checked)}
                  />
                  Tem cabo / alça
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-brand bg-bg-muted p-4">
              {estimate ? (
                <>
                  <p className="text-xs uppercase tracking-widest2 text-text-muted">
                    Área: {estimate.areaM2.toFixed(2)} m²
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold text-primary">
                    {currency.format(estimate.estimatedPrice)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Valor estimado — confirmamos o preço final ao analisar seu
                    pedido.
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-muted">
                  Preencha largura e comprimento para ver uma estimativa.
                </p>
              )}
            </div>

            <h2 className="mt-6 font-heading text-sm font-semibold uppercase tracking-widest2 text-text-muted">
              Detalhes da peça
            </h2>
            <div className="mt-3 space-y-1.5">
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

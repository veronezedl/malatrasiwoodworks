import * as React from "react";
import { Eye } from "lucide-react";
import {
  convertQuoteToOrder,
  listQuoteRequests,
  updateQuoteRequest,
} from "@/lib/api/quotes";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_OPTIONS,
  type QuoteStatus,
  type QuoteWithCustomer,
} from "@/types/database";
import { getProductTypeConfig } from "@/lib/pricing";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

const STATUS_VARIANT: Record<QuoteStatus, "default" | "primary" | "success" | "accent"> = {
  novo: "default",
  em_analise: "primary",
  orcamento_enviado: "accent",
  aprovado: "success",
  recusado: "default",
  convertido: "success",
};

function QuoteDetailDialog({
  quote,
  onSaved,
}: {
  quote: QuoteWithCustomer;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<QuoteStatus>(quote.status);
  const [quotedPrice, setQuotedPrice] = React.useState(
    quote.quoted_price != null
      ? String(quote.quoted_price)
      : quote.estimated_price != null
        ? String(quote.estimated_price)
        : "",
  );
  const [adminNotes, setAdminNotes] = React.useState(quote.admin_notes ?? "");
  const [saving, setSaving] = React.useState(false);
  const [converting, setConverting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setStatus(quote.status);
    setQuotedPrice(
      quote.quoted_price != null
        ? String(quote.quoted_price)
        : quote.estimated_price != null
          ? String(quote.estimated_price)
          : "",
    );
    setAdminNotes(quote.admin_notes ?? "");
  }, [open, quote]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateQuoteRequest(quote.id, {
        status,
        quoted_price: quotedPrice ? Number(quotedPrice) : null,
        admin_notes: adminNotes || null,
      });
      showToast("Orçamento atualizado");
      onSaved();
      setOpen(false);
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert() {
    if (!quotedPrice) {
      showToast("Defina o preço antes de converter em pedido");
      return;
    }
    setConverting(true);
    try {
      await updateQuoteRequest(quote.id, {
        quoted_price: Number(quotedPrice),
        admin_notes: adminNotes || null,
      });
      await convertQuoteToOrder({ ...quote, quoted_price: Number(quotedPrice) }, quote.customer_id);
      showToast("Orçamento convertido em pedido");
      onSaved();
      setOpen(false);
    } catch (err) {
      showToast("Não foi possível converter", err instanceof Error ? err.message : undefined);
    } finally {
      setConverting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary"
        >
          <Eye className="size-4" /> Ver mais
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Orçamento sob encomenda</DialogTitle>
        </DialogHeader>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Cliente
          </h3>
          <p className="mt-1 text-sm text-text">{quote.customer?.full_name}</p>
          <p className="text-sm text-text-muted">{quote.customer?.email}</p>
          <p className="text-sm text-text-muted">{quote.customer?.phone}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Descrição
          </h3>
          <p className="mt-1 text-sm text-text">{quote.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Tipo de produto
            </h3>
            <p className="mt-1 text-text">
              {quote.product_type ? getProductTypeConfig(quote.product_type).label : "—"}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Madeira
            </h3>
            <p className="mt-1 text-text">{quote.wood_type || "—"}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Medidas
            </h3>
            <p className="mt-1 text-text">
              {quote.width_cm && quote.length_cm
                ? `${quote.width_cm} x ${quote.length_cm}${quote.height_cm ? ` x ${quote.height_cm}` : ""} cm`
                : quote.dimensions || "—"}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Cabo / alça
            </h3>
            <p className="mt-1 text-text">{quote.handle_model?.name ?? "—"}</p>
          </div>
        </div>

        {quote.estimated_price != null && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Estimativa calculada pelo site
            </h3>
            <p className="mt-1 text-sm text-text">{currency.format(quote.estimated_price)}</p>
          </div>
        )}

        {quote.budget_hint != null && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Orçamento estimado pelo cliente
            </h3>
            <p className="mt-1 text-sm text-text">{currency.format(quote.budget_hint)}</p>
          </div>
        )}

        {quote.reference_image_url && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Referência
            </h3>
            <img
              src={quote.reference_image_url}
              alt="Referência enviada pelo cliente"
              className="mt-2 max-h-48 rounded-brand border border-black/10 object-cover"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="quote-status">Status</Label>
          <Select
            id="quote-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus)}
          >
            {QUOTE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {QUOTE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote-price">Preço do orçamento (R$)</Label>
          <Input
            id="quote-price"
            type="number"
            step="0.01"
            min="0"
            value={quotedPrice}
            onChange={(e) => setQuotedPrice(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="quote-notes">Notas internas / resposta ao cliente</Label>
          <Textarea
            id="quote-notes"
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          {quote.status !== "convertido" && (
            <Button
              variant="accent"
              size="sm"
              className="flex-1"
              onClick={handleConvert}
              disabled={converting}
            >
              {converting ? "Convertendo..." : "Converter em pedido"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdminQuotes() {
  useSeo("Orçamentos · Admin Malatrasi WoodWorks", "Gestão de pedidos de orçamento sob encomenda.");
  const [quotes, setQuotes] = React.useState<QuoteWithCustomer[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setQuotes(await listQuoteRequests());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Orçamentos</h1>
      <p className="mt-1 text-sm text-text-muted">
        {quotes.length} {quotes.length === 1 ? "pedido de orçamento" : "pedidos de orçamento"}
      </p>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">Carregando orçamentos...</p>
      ) : quotes.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há pedidos de orçamento.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-brand border border-black/10 bg-white p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-text">{quote.customer?.full_name}</p>
                  <Badge variant={STATUS_VARIANT[quote.status]}>
                    {QUOTE_STATUS_LABELS[quote.status]}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm text-text-muted">{quote.description}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {dateFmt.format(new Date(quote.created_at))}
                  {quote.quoted_price != null
                    ? ` · ${currency.format(quote.quoted_price)}`
                    : quote.estimated_price != null
                      ? ` · ~${currency.format(quote.estimated_price)} (estimativa)`
                      : ""}
                </p>
              </div>
              <QuoteDetailDialog quote={quote} onSaved={load} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { listMyQuoteRequests } from "@/lib/api/quotes";
import { QUOTE_STATUS_LABELS, type DbQuoteRequest, type QuoteStatus } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

export function CuentaOrcamentos() {
  useSeo(
    "Meus orçamentos · Malatrasi WoodWorks",
    "Acompanhe seus pedidos de orçamento sob encomenda na Malatrasi WoodWorks.",
  );
  const [quotes, setQuotes] = React.useState<DbQuoteRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listMyQuoteRequests()
      .then(setQuotes)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-primary">
          Meus orçamentos
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/orcamento">
            <Plus className="size-4" /> Novo pedido de orçamento
          </Link>
        </Button>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Acompanhe o status dos seus pedidos de peças sob encomenda.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-text-muted">Carregando...</p>
      ) : quotes.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">
          Você ainda não solicitou nenhum orçamento.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-black/10 rounded-brand border border-black/10 bg-white">
          {quotes.map((quote) => (
            <div key={quote.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-primary">
                  {quote.description.length > 80
                    ? `${quote.description.slice(0, 80)}...`
                    : quote.description}
                </p>
                <Badge variant={STATUS_VARIANT[quote.status]}>
                  {QUOTE_STATUS_LABELS[quote.status]}
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                {quote.wood_type && <span>Madeira: {quote.wood_type}</span>}
                {quote.dimensions && <span>Medidas: {quote.dimensions}</span>}
                <span>{dateFmt.format(new Date(quote.created_at))}</span>
              </div>
              {quote.quoted_price != null && (
                <p className="mt-2 font-semibold text-primary">
                  Valor do orçamento: {currency.format(quote.quoted_price)}
                </p>
              )}
              {quote.admin_notes && (
                <p className="mt-2 rounded-brand bg-bg-muted p-2.5 text-text-muted">
                  {quote.admin_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

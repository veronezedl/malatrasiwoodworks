import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSeo } from "@/hooks/use-seo";
import { Button } from "@/components/ui/button";

// Página de retorno do Checkout Pro do Mercado Pago (back_urls.success/
// failure/pending em create-mercadopago-preference). Não busca nem exibe os
// dados do pedido em si — isso exigiria permitir leitura anônima de pedido
// por id via RLS, o que vazaria dados de outros clientes pra quem
// adivinhasse a URL. A confirmação de verdade chega por e-mail (webhook).
const STATUS_CONTENT = {
  approved: {
    icon: CheckCircle2,
    iconClass: "bg-success/10 text-success",
    title: "Pagamento aprovado!",
    message:
      "Seu pedido foi confirmado. Você vai receber um e-mail com os detalhes em instantes.",
  },
  pending: {
    icon: Clock,
    iconClass: "bg-accent/10 text-accent",
    title: "Pagamento em análise",
    message:
      "Assim que o Mercado Pago confirmar, seu pedido é atualizado automaticamente e avisamos por e-mail.",
  },
  failure: {
    icon: XCircle,
    iconClass: "bg-accent/10 text-accent",
    title: "Pagamento não aprovado",
    message:
      "Não foi possível concluir o pagamento. Você pode tentar novamente ou escolher outra forma de pagamento no checkout.",
  },
} as const;

export function PedidoConfirmado() {
  useSeo(
    "Pedido · Malatrasi WoodWorks",
    "Status do pagamento do seu pedido na Malatrasi WoodWorks.",
  );
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const status = searchParams.get("status");
  const content =
    STATUS_CONTENT[status as keyof typeof STATUS_CONTENT] ?? STATUS_CONTENT.pending;
  const Icon = content.icon;

  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div
        className={`mx-auto flex size-14 items-center justify-center rounded-full ${content.iconClass}`}
      >
        <Icon className="size-7" />
      </div>
      <h1 className="mt-4 font-heading text-2xl font-bold text-primary">
        {content.title}
      </h1>
      <p className="mt-2 text-sm text-text-muted">{content.message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {session && (
          <Button asChild variant="accent">
            <Link to="/conta/pedidos">Meus pedidos</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/produtos">Continuar navegando</Link>
        </Button>
      </div>
    </section>
  );
}

import * as React from "react";
import { Eye } from "lucide-react";
import { inviteCustomerToRegister } from "@/lib/api/customers";
import type { DbCustomer } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

interface AdminCustomerQuickViewProps {
  customer: DbCustomer;
  trigger?: React.ReactNode;
  onInvited?: () => void;
}

export function AdminCustomerQuickView({
  customer,
  trigger,
  onInvited,
}: AdminCustomerQuickViewProps) {
  const [open, setOpen] = React.useState(false);
  const [inviting, setInviting] = React.useState(false);
  const { showToast } = useToast();
  const isGuest = !customer.auth_user_id;

  async function handleInvite() {
    setInviting(true);
    try {
      await inviteCustomerToRegister(customer.id);
      showToast("Convite enviado");
      onInvited?.();
    } catch (err) {
      showToast("Não foi possível convidar", err instanceof Error ? err.message : undefined);
    } finally {
      setInviting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary"
          >
            <Eye className="size-4" /> Ver mais
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 pr-6">
            <DialogTitle>{customer.full_name || "Sem nome"}</DialogTitle>
            {isGuest && <Badge variant="accent">Pré-cadastro</Badge>}
          </div>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-text-muted">Email</dt>
            <dd className="text-text">{customer.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Telefone</dt>
            <dd className="text-text">{customer.phone || "—"}</dd>
          </div>
          {customer.cpf_cnpj && (
            <div>
              <dt className="text-xs text-text-muted">CPF / CNPJ</dt>
              <dd className="text-text">{customer.cpf_cnpj}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-text-muted">Endereço</dt>
            <dd className="text-text">
              {customer.address_line1 ? (
                <>
                  {customer.address_line1}
                  {customer.address_line2 ? `, ${customer.address_line2}` : ""}
                  <br />
                  {customer.neighborhood ? `${customer.neighborhood} · ` : ""}
                  {customer.postal_code} {customer.city}
                  {customer.region ? `, ${customer.region}` : ""}
                  <br />
                  {customer.country_code}
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Marketing</dt>
            <dd className="text-text">
              {customer.marketing_opt_in ? "Inscrito" : "Não inscrito"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Cliente desde</dt>
            <dd className="text-text">
              {dateFmt.format(new Date(customer.created_at))}
            </dd>
          </div>
          {customer.invited_at && (
            <div>
              <dt className="text-xs text-text-muted">Convidado em</dt>
              <dd className="text-text">
                {dateFmt.format(new Date(customer.invited_at))}
              </dd>
            </div>
          )}
        </dl>

        {isGuest && customer.email && (
          <Button onClick={handleInvite} disabled={inviting} className="w-full">
            {inviting
              ? "Enviando..."
              : customer.invited_at
                ? "Reenviar convite"
                : "Convidar para completar cadastro"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

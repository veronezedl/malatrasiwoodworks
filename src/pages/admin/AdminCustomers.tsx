import * as React from "react";
import { listCustomers } from "@/lib/api/customers";
import type { DbCustomer } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { AdminCustomerQuickView } from "@/components/admin/AdminCustomerQuickView";
import { Badge } from "@/components/ui/badge";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function AdminCustomers() {
  useSeo("Clientes · Admin Malatrasi WoodWorks", "Lista de clientes.");
  const [customers, setCustomers] = React.useState<DbCustomer[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setCustomers(await listCustomers());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">
        Clientes
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        {customers.length} {customers.length === 1 ? "cliente" : "clientes"}
      </p>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">Carregando clientes...</p>
      ) : customers.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há clientes cadastrados.
        </p>
      ) : (
        <>
          {/* Mobile: cards — todos os dados não cabem em uma tabela legível */}
          <div className="mt-6 space-y-3 md:hidden">
            {customers.map((customer) => (
              <AdminCustomerQuickView
                key={customer.id}
                customer={customer}
                onInvited={load}
                trigger={
                  <button
                    type="button"
                    className="w-full rounded-brand border border-black/10 bg-white p-4 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text">
                        {customer.full_name || "Sem nome"}
                      </p>
                      {!customer.auth_user_id && (
                        <Badge variant="accent">Pré-cadastro</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-text-muted">
                      {customer.email || "—"}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                      <span>{customer.city || "—"}</span>
                      <span>Desde {dateFmt.format(new Date(customer.created_at))}</span>
                    </div>
                  </button>
                }
              />
            ))}
          </div>

          {/* Desktop/tablet: tabela completa, com popup de detalhe para não
              precisar abrir outra tela para consultar cada cliente */}
          <div className="mt-6 hidden overflow-x-auto rounded-brand border border-black/10 bg-white md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Cidade</th>
                  <th className="px-4 py-3 font-medium">Desde</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">
                      <div className="flex items-center gap-2">
                        {customer.full_name || "Sem nome"}
                        {!customer.auth_user_id && (
                          <Badge variant="accent">Pré-cadastro</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {customer.email || "—"}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {customer.city || "—"}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {dateFmt.format(new Date(customer.created_at))}
                    </td>
                    <td className="px-4 py-3">
                      <AdminCustomerQuickView customer={customer} onInvited={load} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

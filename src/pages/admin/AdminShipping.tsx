import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  createShippingMethod,
  deleteShippingMethod,
  listShippingMethods,
  updateShippingMethod,
} from "@/lib/api/shipping";
import type { DbShippingMethod } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const emptyForm = {
  name: "",
  minDays: "",
  maxDays: "",
  price: "",
  active: true,
  visibleInStore: true,
};

type ShippingFormState = typeof emptyForm;

function methodToForm(method: DbShippingMethod): ShippingFormState {
  return {
    name: method.name,
    minDays: String(method.min_days),
    maxDays: String(method.max_days),
    price: String(method.price),
    active: method.active,
    visibleInStore: method.visible_in_store,
  };
}

function ShippingFormFields({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: ShippingFormState;
  onChange: (form: ShippingFormState) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Método de entrega</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="ex: Entrega combinada"
          required
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-min-days`}>Dias mínimo</Label>
          <Input
            id={`${idPrefix}-min-days`}
            type="number"
            min="0"
            value={form.minDays}
            onChange={(e) => onChange({ ...form, minDays: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-max-days`}>Dias máximo</Label>
          <Input
            id={`${idPrefix}-max-days`}
            type="number"
            min="0"
            value={form.maxDays}
            onChange={(e) => onChange({ ...form, maxDays: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-price`}>Preço (R$)</Label>
          <Input
            id={`${idPrefix}-price`}
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => onChange({ ...form, price: e.target.value })}
            required
          />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={form.active}
          onChange={(e) => onChange({ ...form, active: e.target.checked })}
        />
        Ativo
      </label>

      <label className="mt-2 flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={form.visibleInStore}
          onChange={(e) => onChange({ ...form, visibleInStore: e.target.checked })}
        />
        Visível na loja
      </label>
      <p className="mt-1 text-xs text-text-muted">
        Desative para métodos que não devem aparecer no checkout normal da loja.
      </p>
    </>
  );
}

interface EditShippingDialogProps {
  method: DbShippingMethod | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditShippingDialog({ method, onClose, onSaved }: EditShippingDialogProps) {
  const { showToast } = useToast();
  const [form, setForm] = React.useState<ShippingFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (method) setForm(methodToForm(method));
  }, [method]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return;
    setSaving(true);
    try {
      await updateShippingMethod(method.id, {
        name: form.name,
        min_days: Number(form.minDays),
        max_days: Number(form.maxDays),
        price: Number(form.price),
        active: form.active,
        visible_in_store: form.visibleInStore,
      });
      showToast("Método de entrega atualizado");
      onSaved();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!method} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar método de entrega</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ShippingFormFields idPrefix="edit-s" form={form} onChange={setForm} />
          <Button type="submit" className="mt-5 w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminShipping() {
  useSeo("Entregas · Admin Malatrasi WoodWorks", "Gestão de métodos de entrega.");
  const { showToast } = useToast();
  const [methods, setMethods] = React.useState<DbShippingMethod[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<ShippingFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [editingMethod, setEditingMethod] = React.useState<DbShippingMethod | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setMethods(await listShippingMethods());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createShippingMethod({
        name: form.name,
        min_days: Number(form.minDays),
        max_days: Number(form.maxDays),
        price: Number(form.price),
        active: form.active,
        visible_in_store: form.visibleInStore,
      });
      showToast("Método de entrega criado");
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(method: DbShippingMethod) {
    if (!window.confirm(`Excluir "${method.name}"?`)) return;
    try {
      await deleteShippingMethod(method.id);
      showToast("Método de entrega excluído");
      load();
    } catch (err) {
      showToast("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  }

  async function toggleActive(method: DbShippingMethod) {
    await updateShippingMethod(method.id, { active: !method.active });
    setMethods((prev) =>
      prev.map((m) => (m.id === method.id ? { ...m, active: !m.active } : m)),
    );
  }

  async function toggleVisibleInStore(method: DbShippingMethod) {
    await updateShippingMethod(method.id, { visible_in_store: !method.visible_in_store });
    setMethods((prev) =>
      prev.map((m) =>
        m.id === method.id ? { ...m, visible_in_store: !m.visible_in_store } : m,
      ),
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Entregas</h1>
      <p className="mt-1 text-sm text-text-muted">
        Métodos de entrega disponíveis para o cliente no checkout.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-brand border border-black/10 bg-white p-6"
      >
        <h2 className="font-heading text-sm font-semibold text-primary">
          Novo método
        </h2>

        <div className="mt-4">
          <ShippingFormFields idPrefix="s" form={form} onChange={setForm} />
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={saving}>
          {saving ? "Salvando..." : "Criar método"}
        </Button>
      </form>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Carregando métodos de entrega...
        </p>
      ) : methods.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há métodos de entrega.
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {methods.map((method) => (
              <div
                key={method.id}
                className="rounded-brand border border-black/10 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">{method.name}</p>
                    <p className="text-xs text-text-muted">
                      {method.min_days === method.max_days
                        ? `${method.min_days} dias`
                        : `${method.min_days}–${method.max_days} dias`}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-primary">
                    {method.price === 0 ? "Grátis" : currency.format(method.price)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => toggleActive(method)}>
                      <Badge variant={method.active ? "success" : "default"}>
                        {method.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </button>
                    <button type="button" onClick={() => toggleVisibleInStore(method)}>
                      <Badge variant={method.visible_in_store ? "success" : "default"}>
                        {method.visible_in_store ? "Visível na loja" : "Oculto"}
                      </Badge>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingMethod(method)}
                      className="text-text-muted hover:text-primary"
                      aria-label={`Editar ${method.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(method)}
                      className="text-text-muted hover:text-accent"
                      aria-label={`Excluir ${method.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: tabela completa */}
          <div className="mt-6 hidden overflow-x-auto rounded-brand border border-black/10 bg-white md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">Prazo estimado</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Visibilidade</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((method) => (
                  <tr key={method.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{method.name}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {method.min_days === method.max_days
                        ? `${method.min_days} dias`
                        : `${method.min_days}–${method.max_days} dias`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {method.price === 0 ? "Grátis" : currency.format(method.price)}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(method)}>
                        <Badge variant={method.active ? "success" : "default"}>
                          {method.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleVisibleInStore(method)}>
                        <Badge variant={method.visible_in_store ? "success" : "default"}>
                          {method.visible_in_store ? "Na loja" : "Oculto"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingMethod(method)}
                          className="text-text-muted hover:text-primary"
                          aria-label={`Editar ${method.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(method)}
                          className="text-text-muted hover:text-accent"
                          aria-label={`Excluir ${method.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EditShippingDialog
        method={editingMethod}
        onClose={() => setEditingMethod(null)}
        onSaved={() => {
          setEditingMethod(null);
          load();
        }}
      />
    </div>
  );
}

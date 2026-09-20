import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  createAddon,
  deleteAddon,
  listAddons,
  updateAddon,
} from "@/lib/api/addons";
import type { DbAddon } from "@/types/database";
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
  price: "",
  active: true,
};

type AddonFormState = typeof emptyForm;

function addonToForm(addon: DbAddon): AddonFormState {
  return {
    name: addon.name,
    price: String(addon.price),
    active: addon.active,
  };
}

function AddonFormFields({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: AddonFormState;
  onChange: (form: AddonFormState) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Nome do adicional</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="ex: Embalagem para presente"
          required
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor={`${idPrefix}-price`}>Valor (R$)</Label>
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

      <label className="mt-4 flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={form.active}
          onChange={(e) => onChange({ ...form, active: e.target.checked })}
        />
        Ativo
      </label>
      <p className="mt-1 text-xs text-text-muted">
        Desative para adicionais que não devem mais aparecer no checkout.
      </p>
    </>
  );
}

interface EditAddonDialogProps {
  addon: DbAddon | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditAddonDialog({ addon, onClose, onSaved }: EditAddonDialogProps) {
  const { showToast } = useToast();
  const [form, setForm] = React.useState<AddonFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (addon) setForm(addonToForm(addon));
  }, [addon]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addon) return;
    setSaving(true);
    try {
      await updateAddon(addon.id, {
        name: form.name,
        price: Number(form.price),
        active: form.active,
      });
      showToast("Adicional atualizado");
      onSaved();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!addon} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar adicional</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <AddonFormFields idPrefix="edit-a" form={form} onChange={setForm} />
          <Button type="submit" className="mt-5 w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminAddons() {
  useSeo(
    "Adicionais · Admin Malatrasi WoodWorks",
    "Gestão dos adicionais oferecidos no checkout do pedido.",
  );
  const { showToast } = useToast();
  const [addons, setAddons] = React.useState<DbAddon[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<AddonFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [editingAddon, setEditingAddon] = React.useState<DbAddon | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setAddons(await listAddons());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAddon({
        name: form.name,
        price: Number(form.price),
        active: form.active,
      });
      showToast("Adicional criado");
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(addon: DbAddon) {
    if (!window.confirm(`Excluir "${addon.name}"?`)) return;
    try {
      await deleteAddon(addon.id);
      showToast("Adicional excluído");
      load();
    } catch (err) {
      showToast("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  }

  async function toggleActive(addon: DbAddon) {
    await updateAddon(addon.id, { active: !addon.active });
    setAddons((prev) =>
      prev.map((m) => (m.id === addon.id ? { ...m, active: !m.active } : m)),
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Adicionais</h1>
      <p className="mt-1 text-sm text-text-muted">
        Extras que o cliente pode marcar no checkout (ex.: embalagem para presente). O valor é somado uma vez ao total do pedido.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-brand border border-black/10 bg-white p-6"
      >
        <h2 className="font-heading text-sm font-semibold text-primary">
          Novo adicional
        </h2>

        <div className="mt-4">
          <AddonFormFields idPrefix="a" form={form} onChange={setForm} />
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={saving}>
          {saving ? "Salvando..." : "Criar adicional"}
        </Button>
      </form>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Carregando adicionais...
        </p>
      ) : addons.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há adicionais cadastrados.
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {addons.map((addon) => (
              <div
                key={addon.id}
                className="rounded-brand border border-black/10 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-text">{addon.name}</p>
                  <p className="shrink-0 font-semibold text-primary">
                    {addon.price === 0
                      ? "Grátis"
                      : `+${currency.format(addon.price)}`}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => toggleActive(addon)}>
                    <Badge variant={addon.active ? "success" : "default"}>
                      {addon.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingAddon(addon)}
                      className="text-text-muted hover:text-primary"
                      aria-label={`Editar ${addon.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(addon)}
                      className="text-text-muted hover:text-accent"
                      aria-label={`Excluir ${addon.name}`}
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
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Adicional</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {addons.map((addon) => (
                  <tr key={addon.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{addon.name}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {addon.price === 0
                        ? "Grátis"
                        : `+${currency.format(addon.price)}`}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(addon)}>
                        <Badge variant={addon.active ? "success" : "default"}>
                          {addon.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingAddon(addon)}
                          className="text-text-muted hover:text-primary"
                          aria-label={`Editar ${addon.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(addon)}
                          className="text-text-muted hover:text-accent"
                          aria-label={`Excluir ${addon.name}`}
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

      <EditAddonDialog
        addon={editingAddon}
        onClose={() => setEditingAddon(null)}
        onSaved={() => {
          setEditingAddon(null);
          load();
        }}
      />
    </div>
  );
}

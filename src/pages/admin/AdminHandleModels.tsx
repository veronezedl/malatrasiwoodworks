import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  createHandleModel,
  deleteHandleModel,
  listHandleModels,
  updateHandleModel,
} from "@/lib/api/handleModels";
import type { DbHandleModel } from "@/types/database";
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
  priceSurcharge: "",
  active: true,
};

type HandleModelFormState = typeof emptyForm;

function modelToForm(model: DbHandleModel): HandleModelFormState {
  return {
    name: model.name,
    priceSurcharge: String(model.price_surcharge),
    active: model.active,
  };
}

function HandleModelFormFields({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: HandleModelFormState;
  onChange: (form: HandleModelFormState) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Nome do modelo</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="ex: Alça em U"
          required
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor={`${idPrefix}-price`}>Sobretaxa (R$)</Label>
        <Input
          id={`${idPrefix}-price`}
          type="number"
          step="0.01"
          min="0"
          value={form.priceSurcharge}
          onChange={(e) => onChange({ ...form, priceSurcharge: e.target.value })}
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
        Desative para modelos que não devem mais aparecer na calculadora de
        orçamento.
      </p>
    </>
  );
}

interface EditHandleModelDialogProps {
  model: DbHandleModel | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditHandleModelDialog({ model, onClose, onSaved }: EditHandleModelDialogProps) {
  const { showToast } = useToast();
  const [form, setForm] = React.useState<HandleModelFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (model) setForm(modelToForm(model));
  }, [model]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!model) return;
    setSaving(true);
    try {
      await updateHandleModel(model.id, {
        name: form.name,
        price_surcharge: Number(form.priceSurcharge),
        active: form.active,
      });
      showToast("Modelo de alça atualizado");
      onSaved();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!model} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar modelo de alça</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <HandleModelFormFields idPrefix="edit-h" form={form} onChange={setForm} />
          <Button type="submit" className="mt-5 w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminHandleModels() {
  useSeo(
    "Modelos de Alça · Admin Malatrasi WoodWorks",
    "Gestão dos modelos de alça/cabo disponíveis na calculadora de orçamento.",
  );
  const { showToast } = useToast();
  const [models, setModels] = React.useState<DbHandleModel[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<HandleModelFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [editingModel, setEditingModel] = React.useState<DbHandleModel | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setModels(await listHandleModels());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createHandleModel({
        name: form.name,
        price_surcharge: Number(form.priceSurcharge),
        active: form.active,
      });
      showToast("Modelo de alça criado");
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(model: DbHandleModel) {
    if (!window.confirm(`Excluir "${model.name}"?`)) return;
    try {
      await deleteHandleModel(model.id);
      showToast("Modelo de alça excluído");
      load();
    } catch (err) {
      showToast("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  }

  async function toggleActive(model: DbHandleModel) {
    await updateHandleModel(model.id, { active: !model.active });
    setModels((prev) =>
      prev.map((m) => (m.id === model.id ? { ...m, active: !m.active } : m)),
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Modelos de Alça</h1>
      <p className="mt-1 text-sm text-text-muted">
        Opções de cabo/alça disponíveis na calculadora de orçamento sob medida.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-brand border border-black/10 bg-white p-6"
      >
        <h2 className="font-heading text-sm font-semibold text-primary">
          Novo modelo
        </h2>

        <div className="mt-4">
          <HandleModelFormFields idPrefix="h" form={form} onChange={setForm} />
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={saving}>
          {saving ? "Salvando..." : "Criar modelo"}
        </Button>
      </form>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Carregando modelos de alça...
        </p>
      ) : models.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há modelos de alça cadastrados.
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {models.map((model) => (
              <div
                key={model.id}
                className="rounded-brand border border-black/10 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-text">{model.name}</p>
                  <p className="shrink-0 font-semibold text-primary">
                    {model.price_surcharge === 0
                      ? "Sem custo extra"
                      : `+${currency.format(model.price_surcharge)}`}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => toggleActive(model)}>
                    <Badge variant={model.active ? "success" : "default"}>
                      {model.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingModel(model)}
                      className="text-text-muted hover:text-primary"
                      aria-label={`Editar ${model.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(model)}
                      className="text-text-muted hover:text-accent"
                      aria-label={`Excluir ${model.name}`}
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
                  <th className="px-4 py-3 font-medium">Modelo</th>
                  <th className="px-4 py-3 font-medium">Sobretaxa</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{model.name}</td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      {model.price_surcharge === 0
                        ? "Sem custo extra"
                        : `+${currency.format(model.price_surcharge)}`}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(model)}>
                        <Badge variant={model.active ? "success" : "default"}>
                          {model.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingModel(model)}
                          className="text-text-muted hover:text-primary"
                          aria-label={`Editar ${model.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(model)}
                          className="text-text-muted hover:text-accent"
                          aria-label={`Excluir ${model.name}`}
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

      <EditHandleModelDialog
        model={editingModel}
        onClose={() => setEditingModel(null)}
        onSaved={() => {
          setEditingModel(null);
          load();
        }}
      />
    </div>
  );
}

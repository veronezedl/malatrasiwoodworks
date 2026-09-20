import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/lib/api/categories";
import type { DbCategory } from "@/types/database";
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

const emptyForm = { name: "", active: true };

type CategoryFormState = typeof emptyForm;

function categoryToForm(category: DbCategory): CategoryFormState {
  return { name: category.name, active: category.active };
}

function CategoryFormFields({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: CategoryFormState;
  onChange: (form: CategoryFormState) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Nome da categoria</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="ex: Mesas"
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
        Ativa
      </label>
      <p className="mt-1 text-xs text-text-muted">
        Desative para deixar de mostrar essa categoria nos filtros do
        catálogo — produtos já cadastrados nela continuam existindo.
      </p>
    </>
  );
}

interface EditCategoryDialogProps {
  category: DbCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditCategoryDialog({ category, onClose, onSaved }: EditCategoryDialogProps) {
  const { showToast } = useToast();
  const [form, setForm] = React.useState<CategoryFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (category) setForm(categoryToForm(category));
  }, [category]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    setSaving(true);
    try {
      await updateCategory(category.id, { name: form.name, active: form.active });
      showToast("Categoria atualizada");
      onSaved();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <CategoryFormFields idPrefix="edit-c" form={form} onChange={setForm} />
          <Button type="submit" className="mt-5 w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminCategories() {
  useSeo(
    "Categorias · Admin Malatrasi WoodWorks",
    "Gestão das categorias de produto usadas no catálogo.",
  );
  const { showToast } = useToast();
  const [categories, setCategories] = React.useState<DbCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<CategoryFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<DbCategory | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setCategories(await listCategories());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createCategory({ name: form.name, active: form.active });
      showToast("Categoria criada");
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: DbCategory) {
    if (!window.confirm(`Excluir "${category.name}"?`)) return;
    try {
      await deleteCategory(category.id);
      showToast("Categoria excluída");
      load();
    } catch (err) {
      showToast(
        "Não foi possível excluir",
        err instanceof Error
          ? "Existem produtos usando essa categoria. Mude a categoria deles antes de excluir."
          : undefined,
      );
    }
  }

  async function toggleActive(category: DbCategory) {
    await updateCategory(category.id, { active: !category.active });
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, active: !c.active } : c)),
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Categorias</h1>
      <p className="mt-1 text-sm text-text-muted">
        Categorias de produto usadas no catálogo, nos filtros e nos
        agrupamentos da loja.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-brand border border-black/10 bg-white p-6"
      >
        <h2 className="font-heading text-sm font-semibold text-primary">
          Nova categoria
        </h2>

        <div className="mt-4">
          <CategoryFormFields idPrefix="c" form={form} onChange={setForm} />
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={saving}>
          {saving ? "Salvando..." : "Criar categoria"}
        </Button>
      </form>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Carregando categorias...
        </p>
      ) : categories.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há categorias cadastradas.
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-brand border border-black/10 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-text">{category.name}</p>
                  <button type="button" onClick={() => toggleActive(category)}>
                    <Badge variant={category.active ? "success" : "default"}>
                      {category.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="text-text-muted hover:text-primary"
                    aria-label={`Editar ${category.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    className="text-text-muted hover:text-accent"
                    aria-label={`Excluir ${category.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: tabela completa */}
          <div className="mt-6 hidden overflow-x-auto rounded-brand border border-black/10 bg-white md:block">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{category.name}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => toggleActive(category)}>
                        <Badge variant={category.active ? "success" : "default"}>
                          {category.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="text-text-muted hover:text-primary"
                          aria-label={`Editar ${category.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="text-text-muted hover:text-accent"
                          aria-label={`Excluir ${category.name}`}
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

      <EditCategoryDialog
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSaved={() => {
          setEditingCategory(null);
          load();
        }}
      />
    </div>
  );
}

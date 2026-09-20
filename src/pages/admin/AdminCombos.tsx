import * as React from "react";
import { ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createCombo,
  deleteCombo,
  listCombos,
  updateCombo,
  type ComboInput,
} from "@/lib/api/combos";
import { listProducts, uploadProductImage } from "@/lib/api/products";
import type { ComboWithItems, ProductWithCategory } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

interface ComboFormState {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  active: boolean;
  items: { product_id: string; quantity: string }[];
}

const emptyForm: ComboFormState = {
  name: "",
  description: "",
  imageUrl: "",
  price: "",
  active: true,
  items: [{ product_id: "", quantity: "1" }],
};

function comboToForm(combo: ComboWithItems): ComboFormState {
  return {
    name: combo.name,
    description: combo.description,
    imageUrl: combo.image_url ?? "",
    price: String(combo.price),
    active: combo.active,
    items:
      combo.items.length > 0
        ? combo.items.map((i) => ({
            product_id: i.product_id,
            quantity: String(i.quantity),
          }))
        : emptyForm.items,
  };
}

function formToInput(form: ComboFormState): ComboInput | string {
  const items = form.items
    .filter((i) => i.product_id)
    .map((i) => ({ product_id: i.product_id, quantity: Number(i.quantity) }));
  if (items.length === 0) return "Adicione pelo menos um produto ao kit.";
  if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1)) {
    return "A quantidade de cada produto deve ser um número inteiro a partir de 1.";
  }
  const price = Number(form.price);
  if (!(price > 0)) return "Informe o preço fechado do kit.";
  return {
    name: form.name,
    description: form.description,
    image_url: form.imageUrl || null,
    price,
    active: form.active,
    items,
  };
}

function ComboFormFields({
  idPrefix,
  form,
  products,
  onChange,
}: {
  idPrefix: string;
  form: ComboFormState;
  products: ProductWithCategory[];
  onChange: (form: ComboFormState) => void;
}) {
  const { showToast } = useToast();
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const itemsTotal = form.items.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.product_id);
    return sum + (product ? product.price * (Number(item.quantity) || 0) : 0);
  }, 0);
  const price = Number(form.price) || 0;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      onChange({ ...form, imageUrl: await uploadProductImage(file) });
    } catch (err) {
      showToast("Não foi possível enviar a imagem", err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setItem(index: number, patch: Partial<ComboFormState["items"][number]>) {
    onChange({
      ...form,
      items: form.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Nome do kit</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="ex: Kit Churrasco"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-description`}>Descrição (opcional)</Label>
        <Textarea
          id={`${idPrefix}-description`}
          rows={2}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-image`}>Imagem do kit (opcional)</Label>
        <p className="text-xs text-text-muted">
          Recomendado: foto quadrada (1:1), pelo menos 1000×1000px, em JPG ou PNG.
        </p>
        <div className="flex items-center gap-3">
          {form.imageUrl ? (
            <img
              src={form.imageUrl}
              alt=""
              className="size-16 rounded-brand border border-black/10 object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-brand border border-dashed border-black/20 text-text-muted">
              <ImagePlus className="size-6" />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Enviando..." : "Enviar imagem"}
          </Button>
          <input
            ref={fileRef}
            id={`${idPrefix}-image`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-brand border border-black/10 p-3">
        <p className="text-sm font-medium text-text">Produtos do kit</p>
        {form.items.map((item, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor={`${idPrefix}-item-${index}`} className="text-xs">
                Produto
              </Label>
              <Select
                id={`${idPrefix}-item-${index}`}
                value={item.product_id}
                onChange={(e) => setItem(index, { product_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {currency.format(p.price)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-20 space-y-1">
              <Label htmlFor={`${idPrefix}-qty-${index}`} className="text-xs">
                Qtd.
              </Label>
              <Input
                id={`${idPrefix}-qty-${index}`}
                type="number"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(e) => setItem(index, { quantity: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remover produto"
              disabled={form.items.length === 1}
              onClick={() =>
                onChange({ ...form, items: form.items.filter((_, i) => i !== index) })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ ...form, items: [...form.items, { product_id: "", quantity: "1" }] })
          }
        >
          <Plus /> Adicionar produto
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-price`}>Preço fechado do kit (R$)</Label>
        <Input
          id={`${idPrefix}-price`}
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={(e) => onChange({ ...form, price: e.target.value })}
          required
        />
        {itemsTotal > 0 && (
          <p className="text-xs text-text-muted">
            Soma dos produtos separados: {currency.format(itemsTotal)}
            {price > 0 && price < itemsTotal
              ? ` — o cliente economiza ${currency.format(itemsTotal - price)}.`
              : price >= itemsTotal && price > 0
                ? " — o kit está sem desconto."
                : ""}
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={form.active}
          onChange={(e) => onChange({ ...form, active: e.target.checked })}
        />
        Ativo (aparece na loja)
      </label>
    </div>
  );
}

function EditComboDialog({
  combo,
  products,
  onClose,
  onSaved,
}: {
  combo: ComboWithItems | null;
  products: ProductWithCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = React.useState<ComboFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (combo) setForm(comboToForm(combo));
  }, [combo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!combo) return;
    const input = formToInput(form);
    if (typeof input === "string") {
      showToast("Confira o kit", input);
      return;
    }
    setSaving(true);
    try {
      await updateCombo(combo.id, input);
      showToast("Kit atualizado");
      onSaved();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!combo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar kit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ComboFormFields idPrefix="edit-c" form={form} products={products} onChange={setForm} />
          <Button type="submit" className="mt-5 w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminCombos() {
  useSeo(
    "Kits e Combos · Admin Malatrasi WoodWorks",
    "Gestão dos kits e combos de produtos vendidos na loja.",
  );
  const { showToast } = useToast();
  const [combos, setCombos] = React.useState<ComboWithItems[]>([]);
  const [products, setProducts] = React.useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<ComboFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [editingCombo, setEditingCombo] = React.useState<ComboWithItems | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [c, p] = await Promise.all([listCombos(), listProducts()]);
    setCombos(c);
    setProducts(p);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = formToInput(form);
    if (typeof input === "string") {
      showToast("Confira o kit", input);
      return;
    }
    setSaving(true);
    try {
      await createCombo(input);
      showToast("Kit criado");
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(combo: ComboWithItems) {
    if (!window.confirm(`Excluir "${combo.name}"?`)) return;
    try {
      await deleteCombo(combo.id);
      showToast("Kit excluído");
      load();
    } catch (err) {
      showToast("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  }

  async function toggleActive(combo: ComboWithItems) {
    try {
      await updateCombo(combo.id, {
        name: combo.name,
        description: combo.description,
        image_url: combo.image_url,
        price: combo.price,
        active: !combo.active,
        items: combo.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      setCombos((prev) =>
        prev.map((c) => (c.id === combo.id ? { ...c, active: !c.active } : c)),
      );
    } catch (err) {
      showToast("Não foi possível atualizar", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Kits e Combos</h1>
      <p className="mt-1 text-sm text-text-muted">
        Monte kits com produtos do catálogo por um preço fechado. O cliente compra o kit
        inteiro com um clique.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-brand border border-black/10 bg-white p-6"
      >
        <h2 className="font-heading text-sm font-semibold text-primary">Novo kit</h2>
        <div className="mt-4">
          <ComboFormFields idPrefix="c" form={form} products={products} onChange={setForm} />
        </div>
        <Button type="submit" className="mt-5 w-full" disabled={saving}>
          {saving ? "Salvando..." : "Criar kit"}
        </Button>
      </form>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">Carregando kits...</p>
      ) : combos.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há kits cadastrados.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="flex gap-4 rounded-brand border border-black/10 bg-white p-4"
            >
              {combo.image_url ? (
                <img
                  src={combo.image_url}
                  alt=""
                  className="size-20 shrink-0 rounded-brand object-cover"
                />
              ) : (
                <div className="flex size-20 shrink-0 items-center justify-center rounded-brand bg-bg-muted text-text-muted">
                  <ImagePlus className="size-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-text">{combo.name}</p>
                  <p className="shrink-0 font-semibold text-primary">
                    {currency.format(combo.price)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {combo.items
                    .map((i) => `${i.quantity}x ${i.product?.name ?? "Produto removido"}`)
                    .join(" · ")}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => toggleActive(combo)}>
                    <Badge variant={combo.active ? "success" : "default"}>
                      {combo.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingCombo(combo)}
                      className="text-text-muted hover:text-primary"
                      aria-label={`Editar ${combo.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(combo)}
                      className="text-text-muted hover:text-accent"
                      aria-label={`Excluir ${combo.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EditComboDialog
        combo={editingCombo}
        products={products}
        onClose={() => setEditingCombo(null)}
        onSaved={() => {
          setEditingCombo(null);
          load();
        }}
      />
    </div>
  );
}

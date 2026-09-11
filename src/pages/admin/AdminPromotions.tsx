import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  createPromotion,
  deletePromotion,
  listPromotions,
  setActivePromotion,
  updatePromotion,
  type DbPromotion,
} from "@/lib/api/promotions";
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

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const emptyForm = {
  message: "Promoção termina em",
  endsAt: "",
  active: false,
};

type PromoFormState = typeof emptyForm;

// input[type=datetime-local] usa hora local sem timezone (YYYY-MM-DDTHH:mm);
// o banco guarda UTC — essas duas funções fazem a conversão de ida e volta.
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

function promoToForm(promo: DbPromotion): PromoFormState {
  return {
    message: promo.message,
    endsAt: toDatetimeLocal(promo.ends_at),
    active: promo.active,
  };
}

function PromoFormFields({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: PromoFormState;
  onChange: (form: PromoFormState) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-message`}>Mensagem</Label>
        <Input
          id={`${idPrefix}-message`}
          value={form.message}
          onChange={(e) => onChange({ ...form, message: e.target.value })}
          placeholder="ex: Oferta de lançamento termina em"
          required
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor={`${idPrefix}-ends-at`}>Data e hora de término</Label>
        <Input
          id={`${idPrefix}-ends-at`}
          type="datetime-local"
          value={form.endsAt}
          onChange={(e) => onChange({ ...form, endsAt: e.target.value })}
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
        Ativa (visível na loja)
      </label>
    </>
  );
}

interface EditPromotionDialogProps {
  promotion: DbPromotion | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditPromotionDialog({ promotion, onClose, onSaved }: EditPromotionDialogProps) {
  const { showToast } = useToast();
  const [form, setForm] = React.useState<PromoFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (promotion) setForm(promoToForm(promotion));
  }, [promotion]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promotion) return;
    setSaving(true);
    try {
      await updatePromotion(promotion.id, {
        message: form.message,
        ends_at: fromDatetimeLocal(form.endsAt),
      });
      if (form.active !== promotion.active) {
        await setActivePromotion(promotion.id, form.active);
      }
      showToast("Promoção atualizada");
      onSaved();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!promotion} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar promoção</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <PromoFormFields idPrefix="edit-promo" form={form} onChange={setForm} />
          <Button type="submit" className="mt-5 w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPromotions() {
  useSeo("Promoção · Admin Malatrasi WoodWorks", "Gestão da promoção com contagem regressiva.");
  const { showToast } = useToast();
  const [promotions, setPromotions] = React.useState<DbPromotion[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [form, setForm] = React.useState<PromoFormState>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [editingPromo, setEditingPromo] = React.useState<DbPromotion | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setPromotions(await listPromotions());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Siempre se crea inactiva primero — activarla es una llamada aparte
      // que se encarrega de desativar qualquer outra (índice único parcial).
      const created = await createPromotion({
        message: form.message,
        ends_at: fromDatetimeLocal(form.endsAt),
        active: false,
      });
      if (form.active) {
        await setActivePromotion(created.id, true);
      }
      showToast("Promoção criada");
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(promo: DbPromotion) {
    if (!window.confirm(`Excluir "${promo.message}"?`)) return;
    try {
      await deletePromotion(promo.id);
      showToast("Promoção excluída");
      load();
    } catch (err) {
      showToast("Não foi possível excluir", err instanceof Error ? err.message : undefined);
    }
  }

  async function toggleActive(promo: DbPromotion) {
    try {
      await setActivePromotion(promo.id, !promo.active);
      load();
    } catch (err) {
      showToast("Não foi possível atualizar", err instanceof Error ? err.message : undefined);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Promoção</h1>
      <p className="mt-1 text-sm text-text-muted">
        Faixa com contagem regressiva mostrada em toda a loja. Só pode haver
        uma promoção ativa por vez.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-brand border border-black/10 bg-white p-6"
      >
        <h2 className="font-heading text-sm font-semibold text-primary">
          Nova promoção
        </h2>

        <div className="mt-4">
          <PromoFormFields idPrefix="promo" form={form} onChange={setForm} />
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={saving}>
          {saving ? "Salvando..." : "Criar promoção"}
        </Button>
      </form>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Carregando promoções...
        </p>
      ) : promotions.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">
          Ainda não há promoções.
        </p>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="mt-6 space-y-3 md:hidden">
            {promotions.map((promo) => (
              <div
                key={promo.id}
                className="rounded-brand border border-black/10 bg-white p-4"
              >
                <p className="font-medium text-text">{promo.message}</p>
                <p className="text-xs text-text-muted">
                  Termina: {dateTimeFmt.format(new Date(promo.ends_at))}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <button type="button" onClick={() => toggleActive(promo)}>
                    <Badge variant={promo.active ? "success" : "default"}>
                      {promo.active ? "Ativa" : "Inativa"}
                    </Badge>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingPromo(promo)}
                      className="text-text-muted hover:text-primary"
                      aria-label={`Editar ${promo.message}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(promo)}
                      className="text-text-muted hover:text-accent"
                      aria-label={`Excluir ${promo.message}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Escritorio/tablet: tabla completa */}
          <div className="mt-6 hidden overflow-x-auto rounded-brand border border-black/10 bg-white md:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Mensagem</th>
                  <th className="px-4 py-3 font-medium">Termina</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promo) => (
                  <tr key={promo.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{promo.message}</td>
                    <td className="px-4 py-3 text-text-muted">
                      {dateTimeFmt.format(new Date(promo.ends_at))}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(promo)}>
                        <Badge variant={promo.active ? "success" : "default"}>
                          {promo.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingPromo(promo)}
                          className="text-text-muted hover:text-primary"
                          aria-label={`Editar ${promo.message}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(promo)}
                          className="text-text-muted hover:text-accent"
                          aria-label={`Excluir ${promo.message}`}
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

      <EditPromotionDialog
        promotion={editingPromo}
        onClose={() => setEditingPromo(null)}
        onSaved={() => {
          setEditingPromo(null);
          load();
        }}
      />
    </div>
  );
}

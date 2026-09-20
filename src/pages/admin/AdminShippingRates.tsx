import * as React from "react";
import { BR_STATES } from "@/data/states";
import { listShippingRates, saveShippingRates } from "@/lib/api/shippingRates";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminShippingRates() {
  useSeo(
    "Frete por Estado · Admin Malatrasi WoodWorks",
    "Valor do frete por quilo em cada estado atendido.",
  );
  const { showToast } = useToast();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    listShippingRates()
      .then((rates) =>
        setValues(Object.fromEntries(rates.map((r) => [r.uf, String(r.price_per_kg)]))),
      )
      .catch((err) =>
        showToast("Não foi possível carregar a tabela", err instanceof Error ? err.message : undefined),
      )
      .finally(() => setLoading(false));
  }, [showToast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rates: { uf: string; price_per_kg: number }[] = [];
    for (const state of BR_STATES) {
      const raw = (values[state.uf] ?? "").trim();
      if (!raw) continue;
      const price = Number(raw);
      if (!(price > 0)) {
        showToast("Confira a tabela", `O valor de ${state.name} deve ser maior que zero (ou deixe vazio).`);
        return;
      }
      rates.push({ uf: state.uf, price_per_kg: Math.round(price * 100) / 100 });
    }
    setSaving(true);
    try {
      await saveShippingRates(rates);
      showToast("Tabela de frete salva", `${rates.length} ${rates.length === 1 ? "estado atendido" : "estados atendidos"}.`);
    } catch (err) {
      showToast("Não foi possível salvar", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const filled = BR_STATES.filter((s) => (values[s.uf] ?? "").trim()).length;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Frete por Estado</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Informe o valor cobrado por quilo (R$/kg) em cada estado. No carrinho, quando o cliente
        digita o CEP, o frete é o valor por kg do estado multiplicado pelo peso total dos itens.
        Estados sem valor não são atendidos pelo frete por peso. Para usar esta tabela, marque
        "Calcular o valor por peso e estado" em um método da tela Entregas.
      </p>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">Carregando tabela...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 max-w-2xl">
          <div className="overflow-x-auto rounded-brand border border-black/10 bg-white">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">UF</th>
                  <th className="px-4 py-3 font-medium">Valor por kg (R$)</th>
                </tr>
              </thead>
              <tbody>
                {BR_STATES.map((state) => (
                  <tr key={state.uf} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-2 font-medium text-text">{state.name}</td>
                    <td className="px-4 py-2 text-text-muted">{state.uf}</td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        aria-label={`Valor por kg em ${state.name}`}
                        placeholder="Não atende"
                        className="max-w-40"
                        value={values[state.uf] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [state.uf]: e.target.value }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar tabela"}
            </Button>
            <span className="text-xs text-text-muted">
              {filled} de {BR_STATES.length} estados com valor
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

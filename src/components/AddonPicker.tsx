import { Check, ChevronDown, PackagePlus, X } from "lucide-react";
import type { DbAddon } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Seletor de adicionais de uma linha do carrinho. O valor de cada adicional é
// por unidade: com 10 itens, cada adicional marcado custa 10x.
export function AddonPicker({
  addons,
  selectedIds,
  quantity,
  onChange,
}: {
  addons: DbAddon[];
  selectedIds: string[];
  quantity: number;
  onChange: (selected: DbAddon[]) => void;
}) {
  if (addons.length === 0) return null;
  const selected = addons.filter((a) => selectedIds.includes(a.id));
  const unitTotal = selected.reduce((sum, a) => sum + a.price, 0);

  function toggle(addon: DbAddon) {
    onChange(
      selectedIds.includes(addon.id)
        ? selected.filter((a) => a.id !== addon.id)
        : [...selected, addon],
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-2 flex w-full max-w-xs items-center justify-between gap-3 rounded-brand border border-black/10 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-black/20 data-[state=open]:border-accent"
        >
          <span className="flex min-w-0 items-center gap-2">
            <PackagePlus className="size-4 shrink-0 text-accent" />
            <span className="truncate font-medium text-text">
              {selected.length === 0
                ? "Adicionar extras"
                : selected.length === 1
                  ? selected[0].name
                  : `${selected.length} adicionais`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {unitTotal > 0 && (
              <span className="font-semibold text-accent">
                + {currency.format(unitTotal * quantity)}
              </span>
            )}
            <ChevronDown className="size-4 text-text-muted" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-heading text-sm font-semibold text-primary">Adicionais</p>
          <PopoverClose
            aria-label="Fechar"
            className="rounded-full p-1 text-text-muted transition-colors hover:bg-bg-muted"
          >
            <X className="size-4" />
          </PopoverClose>
        </div>
        <p className="mb-3 text-xs text-text-muted">
          O valor é por unidade
          {quantity > 1 ? ` e será multiplicado por ${quantity}.` : "."}
        </p>
        <div className="space-y-2">
          {addons.map((addon) => {
            const isSelected = selectedIds.includes(addon.id);
            return (
              <button
                key={addon.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => toggle(addon)}
                className={`flex w-full items-center justify-between gap-3 rounded-brand border px-3 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-black/10 bg-white hover:border-black/20"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      isSelected ? "border-accent bg-accent text-white" : "border-black/20"
                    }`}
                  >
                    {isSelected && <Check className="size-3" />}
                  </span>
                  <span
                    className={`truncate font-medium ${isSelected ? "text-accent" : "text-text"}`}
                  >
                    {addon.name}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-accent">
                  {addon.price === 0 ? "Grátis" : `+ ${currency.format(addon.price)}`}
                </span>
              </button>
            );
          })}
        </div>
        <PopoverClose asChild>
          <Button type="button" size="sm" className="mt-3 w-full">
            Concluir
          </Button>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

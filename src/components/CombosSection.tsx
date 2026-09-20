import { Boxes } from "lucide-react";
import { useCombos } from "@/hooks/use-combos";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import type { ComboWithItems } from "@/types/database";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function ComboCard({ combo }: { combo: ComboWithItems }) {
  const { addCombo } = useCart();
  const { showToast } = useToast();
  const itemsTotal = combo.items.reduce(
    (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
    0,
  );
  const savings = itemsTotal - combo.price;

  return (
    <div className="flex flex-col overflow-hidden rounded-brand border border-black/10 bg-white transition-shadow hover:shadow-md">
      {combo.image_url ? (
        <img
          src={combo.image_url}
          alt={combo.name}
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-bg-muted text-text-muted">
          <Boxes className="size-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-heading text-base font-semibold text-primary">{combo.name}</h3>
        {combo.description && (
          <p className="line-clamp-2 text-sm text-text-muted">{combo.description}</p>
        )}
        <ul className="space-y-0.5 text-sm text-text-muted">
          {combo.items.map((item) => (
            <li key={item.id}>
              {item.quantity}x {item.product?.name ?? "Produto"}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-2">
          <p className="flex flex-wrap items-baseline gap-x-2">
            {savings > 0 && (
              <span className="text-sm text-text-muted line-through">
                {currency.format(itemsTotal)}
              </span>
            )}
            <span className="font-heading text-xl font-bold text-primary">
              {currency.format(combo.price)}
            </span>
          </p>
          {savings > 0 && (
            <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              Economize {currency.format(savings)}
            </span>
          )}
          <Button
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              if (addCombo(combo)) showToast("Kit adicionado ao carrinho", combo.name);
            }}
            aria-label={`Adicionar o kit ${combo.name} ao carrinho`}
          >
            Adicionar kit
          </Button>
        </div>
      </div>
    </div>
  );
}

// Kits prontos cadastrados pelo admin. Enquanto não houver kit ativo a seção
// simplesmente não aparece (mesmo critério de <CustomerGallerySection>).
export function CombosSection() {
  const { combos, loading } = useCombos();
  if (loading || combos.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <h2 className="font-heading text-3xl font-bold text-primary">Kits e combos</h2>
      <p className="mt-2 text-text-muted">
        Combinações prontas com preço especial — leve o conjunto completo.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo) => (
          <ComboCard key={combo.id} combo={combo} />
        ))}
      </div>
    </section>
  );
}

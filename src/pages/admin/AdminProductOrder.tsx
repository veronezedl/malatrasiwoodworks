import * as React from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { listProducts, swapProductOrder } from "@/lib/api/products";
import type { ProductWithCategory } from "@/types/database";
import { useSeo } from "@/hooks/use-seo";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

interface CategoryGroup {
  name: string;
  categorySortOrder: number;
  products: ProductWithCategory[];
}

// Mesmos critérios do catálogo público (ver sortByCategoryThenOrder em
// lib/api/catalog.ts): ordem manual da categoria primeiro, nome como
// desempate — assim a tela reflete exatamente o que aparece no site.
function groupByCategory(products: ProductWithCategory[]): CategoryGroup[] {
  const byName = new Map<string, ProductWithCategory[]>();
  for (const product of products) {
    const name = product.category?.name ?? "Sem categoria";
    const list = byName.get(name) ?? [];
    list.push(product);
    byName.set(name, list);
  }
  return [...byName.entries()]
    .map(([name, list]) => ({
      name,
      categorySortOrder: list[0]?.category?.sort_order ?? Number.MAX_SAFE_INTEGER,
      products: [...list].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort(
      (a, b) =>
        a.categorySortOrder - b.categorySortOrder ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
}

export function AdminProductOrder() {
  useSeo(
    "Ordenar Produtos · Admin Malatrasi WoodWorks",
    "Ordem dos produtos por categoria na vitrine de destaques da home e no catálogo completo.",
  );
  const { showToast } = useToast();
  const [products, setProducts] = React.useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [movingId, setMovingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await listProducts());
    } catch (err) {
      showToast("Não foi possível carregar os produtos", err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const groups = groupByCategory(products);

  async function move(group: CategoryGroup, index: number, direction: -1 | 1) {
    const a = group.products[index];
    const b = group.products[index + direction];
    if (!a || !b) return;
    setMovingId(a.id);
    try {
      await swapProductOrder(a, b);
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === a.id) return { ...p, sort_order: b.sort_order };
          if (p.id === b.id) return { ...p, sort_order: a.sort_order };
          return p;
        }),
      );
    } catch (err) {
      showToast("Não foi possível reordenar", err instanceof Error ? err.message : undefined);
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-primary">Ordenar Produtos</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-muted">
        Define a ordem dos produtos dentro de cada categoria. Essa ordem vale tanto para a
        vitrine de Destaques da home quanto para o catálogo completo em /produtos.
      </p>

      {loading ? (
        <p className="mt-6 py-10 text-center text-text-muted">Carregando produtos...</p>
      ) : groups.length === 0 ? (
        <p className="mt-6 py-10 text-center text-text-muted">Nenhum produto cadastrado.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <div key={group.name}>
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-muted">
                {group.name}
              </h2>
              <div className="mt-3 divide-y divide-black/5 rounded-brand border border-black/10 bg-white">
                {group.products.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-3 p-3">
                    <img
                      src={product.image_url}
                      alt=""
                      className="size-12 shrink-0 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text">{product.name}</p>
                      <p className="text-xs text-text-muted">
                        {product.is_custom_order ? "Sob orçamento" : currency.format(product.price)}
                      </p>
                    </div>
                    {product.featured && (
                      <Badge variant="accent" className="hidden sm:inline-flex">
                        Na vitrine
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-text-muted">
                      <button
                        type="button"
                        onClick={() => move(group, index, -1)}
                        disabled={index === 0 || movingId !== null}
                        className="flex size-8 items-center justify-center rounded hover:bg-bg-muted hover:text-primary disabled:opacity-30"
                        aria-label={`Mover ${product.name} para cima`}
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(group, index, 1)}
                        disabled={index === group.products.length - 1 || movingId !== null}
                        className="flex size-8 items-center justify-center rounded hover:bg-bg-muted hover:text-primary disabled:opacity-30"
                        aria-label={`Mover ${product.name} para baixo`}
                      >
                        <ArrowDown className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

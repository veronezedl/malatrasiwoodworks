import * as React from "react";
import type { Product } from "@/data/products";
import type { ComboWithItems, DbAddon, PriceTier } from "@/types/database";
import { unitPriceForQty } from "@/lib/pricing";

export interface CartItem {
  id: string;
  // Chave da linha no carrinho: o slug do produto, ou "combo:<id>" para kits.
  slug: string;
  // Ausente nos carrinhos salvos antes dos kits existirem = produto.
  kind?: "product" | "combo";
  name: string;
  // Preço base do produto (as faixas progressivas se aplicam sobre ele) ou o
  // preço fechado do kit.
  price: number;
  // Preço da promoção ativa (substitui o preço base enquanto durar).
  promoPrice?: number | null;
  priceTiers?: PriceTier[];
  components?: { name: string; quantity: number }[];
  // Adicionais escolhidos para esta linha; o valor de cada um é multiplicado
  // pela quantidade da linha.
  addons?: { id: string; name: string; price: number }[];
  image: string;
  quantity: number;
}

// Soma dos adicionais da linha, por unidade.
export function cartItemAddonUnit(item: CartItem): number {
  return (item.addons ?? []).reduce((sum, a) => sum + a.price, 0);
}

// Preço unitário efetivo da linha (já com a faixa progressiva atingida).
export function cartItemUnitPrice(item: CartItem): number {
  if (item.kind === "combo") return item.price;
  return unitPriceForQty(item.promoPrice ?? item.price, item.priceTiers, item.quantity);
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addonsTotal: number;
  addItem: (product: Product, quantity?: number) => boolean;
  addCombo: (combo: ComboWithItems) => boolean;
  syncPrices: (
    products: Product[],
    combos: ComboWithItems[],
    addons: DbAddon[],
  ) => void;
  setItemAddons: (slug: string, addons: DbAddon[]) => void;
  removeItem: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = React.createContext<CartContextValue | null>(null);
const STORAGE_KEY = "malatrasi-woodworks-cart";

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>(readStoredCart);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = React.useCallback((product: Product, quantity = 1): boolean => {
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === product.slug);
      if (existing) {
        return prev.map((i) =>
          i.slug === product.slug
            ? { ...i, quantity: i.quantity + quantity, promoPrice: product.promoPrice }
            : i,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          promoPrice: product.promoPrice,
          priceTiers: product.priceTiers,
          image: product.images[0] ?? "",
          quantity,
        },
      ];
    });
    return true;
  }, []);

  const addCombo = React.useCallback((combo: ComboWithItems): boolean => {
    const key = `combo:${combo.id}`;
    setItems((prev) => {
      if (prev.some((i) => i.slug === key)) {
        return prev.map((i) => (i.slug === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          id: combo.id,
          slug: key,
          kind: "combo",
          name: combo.name,
          price: combo.price,
          components: combo.items.map((ci) => ({
            name: ci.product?.name ?? "Produto",
            quantity: ci.quantity,
          })),
          image: combo.image_url ?? "",
          quantity: 1,
        },
      ];
    });
    return true;
  }, []);

  // Atualiza preços/faixas dos itens do carrinho com o catálogo atual, para
  // não mostrar um valor antigo guardado no localStorage.
  const syncPrices = React.useCallback(
    (products: Product[], combos: ComboWithItems[], addons: DbAddon[]) => {
      setItems((prev) => {
        let changed = false;
        const next = prev.map((baseItem) => {
          let item = baseItem;
          if (item.addons?.length) {
            const fresh = item.addons
              .map((a) => addons.find((x) => x.id === a.id))
              .filter((a): a is DbAddon => !!a)
              .map((a) => ({ id: a.id, name: a.name, price: a.price }));
            if (JSON.stringify(fresh) !== JSON.stringify(item.addons)) {
              changed = true;
              item = { ...item, addons: fresh };
            }
          }
          if (item.kind === "combo") {
            const combo = combos.find((c) => c.id === item.id);
            if (combo && combo.price !== item.price) {
              changed = true;
              return { ...item, price: combo.price };
            }
            return item;
          }
          const product = products.find((p) => p.id === item.id);
          if (
            product &&
            (product.price !== item.price ||
              product.promoPrice !== (item.promoPrice ?? null) ||
              JSON.stringify(product.priceTiers) !== JSON.stringify(item.priceTiers ?? []))
          ) {
            changed = true;
            return {
              ...item,
              price: product.price,
              promoPrice: product.promoPrice,
              priceTiers: product.priceTiers,
            };
          }
          return item;
        });
        return changed ? next : prev;
      });
    },
    [],
  );

  const setItemAddons = React.useCallback((slug: string, addons: DbAddon[]) => {
    setItems((prev) =>
      prev.map((i) =>
        i.slug === slug
          ? { ...i, addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })) }
          : i,
      ),
    );
  }, []);

  const removeItem = React.useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => i.slug !== slug));
  }, []);

  const setQuantity = React.useCallback((slug: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.slug !== slug);
      return prev.map((i) => (i.slug === slug ? { ...i, quantity } : i));
    });
  }, []);

  const clearCart = React.useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.quantity * cartItemUnitPrice(i), 0);
  const addonsTotal = items.reduce((sum, i) => sum + i.quantity * cartItemAddonUnit(i), 0);

  const value = React.useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      addonsTotal,
      addItem,
      addCombo,
      syncPrices,
      setItemAddons,
      removeItem,
      setQuantity,
      clearCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      addonsTotal,
      addItem,
      addCombo,
      syncPrices,
      setItemAddons,
      removeItem,
      setQuantity,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

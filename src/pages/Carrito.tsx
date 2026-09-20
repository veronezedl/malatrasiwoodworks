import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Minus,
  Plus,
  X,
  Truck,
  ChevronDown,
  CheckCircle2,
  PenLine,
} from "lucide-react";
import {
  useCart,
  cartItemAddonUnit,
  cartItemUnitPrice,
  type CartItem,
} from "@/hooks/use-cart";
import { AddonPicker } from "@/components/AddonPicker";
import { activeTier, nextTier } from "@/lib/pricing";
import { useSeo } from "@/hooks/use-seo";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fetchActiveProducts, fetchProductBySlug } from "@/lib/api/catalog";
import { listActiveAddons } from "@/lib/api/addons";
import { listActiveCombos } from "@/lib/api/combos";
import {
  createMercadoPagoPreference,
  createOrder,
  toOrderLines,
  uploadEngravingImage,
} from "@/lib/api/orders";
import { listActiveShippingMethods } from "@/lib/api/shipping";
import { submitGuestOrder, type GuestCustomerInput } from "@/lib/api/guestCheckout";
import {
  type DbAddon,
  type DbOrder,
  type DbShippingMethod,
  type PaymentMethod,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LoginForm } from "@/components/LoginForm";
import { RegistroForm } from "@/components/RegistroForm";
import { GuestCheckoutForm } from "@/components/GuestCheckoutForm";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Todo pedido é pago pelo Mercado Pago; o cliente escolhe Pix, cartão ou
// boleto na página de lá.
const PAYMENT_METHOD: PaymentMethod = "mercadopago";

export function Carrito() {
  useSeo(
    "Seu carrinho · Malatrasi WoodWorks",
    "Revise os produtos do seu carrinho antes de finalizar sua compra na Malatrasi WoodWorks.",
  );
  const {
    items,
    subtotal,
    addonsTotal,
    addItem,
    syncPrices,
    setItemAddons,
    setQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [placing, setPlacing] = React.useState(false);
  const [shippingMethods, setShippingMethods] = React.useState<DbShippingMethod[]>([]);
  const [shippingMethodId, setShippingMethodId] = React.useState<string | null>(null);
  const [loadingShipping, setLoadingShipping] = React.useState(true);
  const [addons, setAddons] = React.useState<DbAddon[]>([]);
  const [successOrder, setSuccessOrder] = React.useState<DbOrder | null>(null);
  const [mobileSummaryOpen, setMobileSummaryOpen] = React.useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"login" | "registro" | "guest">("guest");
  const [resumeSignal, setResumeSignal] = React.useState(0);
  const pendingCheckoutRef = React.useRef(false);
  const [engravingText, setEngravingText] = React.useState("");
  const [engravingFile, setEngravingFile] = React.useState<File | null>(null);

  // Permite que links externos (ex. landing pages de campanha) adicionem um
  // produto direto no carrinho, ex: /carrinho?add=<slug>&qty=2.
  const addFromLinkRef = React.useRef(false);
  React.useEffect(() => {
    const slug = searchParams.get("add");
    if (!slug || addFromLinkRef.current) return;
    // React.StrictMode roda os effects duas vezes em desenvolvimento; esse
    // guard evita adicionar o produto duplicado.
    addFromLinkRef.current = true;
    const qty = Math.max(1, Number(searchParams.get("qty")) || 1);

    fetchProductBySlug(slug)
      .then((product) => {
        if (!product) {
          showToast(
            "Não foi possível adicionar o produto",
            "O link parece não ser válido.",
          );
          return;
        }
        if (addItem(product, qty)) {
          showToast("Produto adicionado", `${product.name} foi adicionado ao seu carrinho.`);
        }
      })
      .catch(() => {
        showToast(
          "Não foi possível adicionar o produto",
          "Tente novamente em instantes.",
        );
      })
      .finally(() => {
        setSearchParams((params) => {
          const next = new URLSearchParams(params);
          next.delete("add");
          next.delete("qty");
          return next;
        }, { replace: true });
      });
    // Deve rodar só uma vez ao entrar com o query param — não a cada mudança
    // de searchParams (já limpamos ele mesmo acima).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    listActiveShippingMethods()
      .then((methods) => {
        setShippingMethods(methods);
        setShippingMethodId((current) => current ?? methods[0]?.id ?? null);
      })
      .catch(() => {
        // Best-effort: sem métodos carregados, o resumo do pedido avisa que
        // nenhuma opção de entrega está disponível.
      })
      .finally(() => setLoadingShipping(false));
  }, []);

  React.useEffect(() => {
    listActiveAddons()
      .then(setAddons)
      .catch(() => {
        // Best-effort: sem adicionais carregados, o bloco simplesmente não aparece.
      });
  }, []);

  // Atualiza preços/faixas dos itens salvos no carrinho com o catálogo atual.
  React.useEffect(() => {
    Promise.all([fetchActiveProducts(), listActiveCombos(), listActiveAddons()])
      .then(([products, combos, activeAddons]) => syncPrices(products, combos, activeAddons))
      .catch(() => {
        // Best-effort: o servidor recalcula tudo de qualquer forma ao finalizar.
      });
  }, [syncPrices]);

  const selectedShipping = shippingMethods.find((m) => m.id === shippingMethodId) ?? null;
  const shippingCost = selectedShipping?.price ?? 0;
  const total = subtotal + addonsTotal + shippingCost;

  // Depois de criar o pedido: se for Mercado Pago, tira o cliente do site e
  // manda pra página de pagamento; senão, mostra o dialog de confirmação
  // normal (pagamento combinado manualmente).
  async function finishCheckout(order: DbOrder) {
    if (order.payment_method === "mercadopago") {
      try {
        const { initPoint } = await createMercadoPagoPreference(order.id);
        clearCart();
        window.location.href = initPoint;
        return;
      } catch (err) {
        showToast(
          "Não foi possível iniciar o pagamento online",
          err instanceof Error
            ? err.message
            : "Tente novamente ou escolha outra forma de pagamento.",
        );
        // O pedido já ficou salvo (pending) — segue pro dialog normal, o
        // admin consegue ver e combinar o pagamento manualmente também.
      }
    }
    clearCart();
    setSuccessOrder(order);
  }

  async function handleCheckout() {
    if (!isSupabaseConfigured) {
      showToast(
        "Compra ainda não disponível",
        "Falta configurar a conexão com o banco de dados.",
      );
      return;
    }
    if (!session) {
      pendingCheckoutRef.current = true;
      setAuthMode("guest");
      setLoginDialogOpen(true);
      return;
    }
    if (!selectedShipping) {
      showToast(
        "Escolha um método de entrega",
        "Selecione como você quer receber seu pedido.",
      );
      return;
    }

    setPlacing(true);
    try {
      const { data: customer, error } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!customer) {
        showToast(
          "Complete seu perfil",
          "Não encontramos seu endereço de entrega.",
        );
        pendingCheckoutRef.current = true;
        setAuthMode("registro");
        setLoginDialogOpen(true);
        return;
      }

      const engravingImageUrl = engravingFile
        ? await uploadEngravingImage(engravingFile)
        : null;

      const order = await createOrder(
        items,
        PAYMENT_METHOD,
        selectedShipping,
        { engravingText: engravingText || null, engravingImageUrl },
      );

      await finishCheckout(order);
    } catch (err) {
      showToast(
        "Não foi possível concluir o pedido",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setPlacing(false);
    }
  }

  async function handleGuestCheckout(
    customer: GuestCustomerInput,
    draftCustomerId: string | null,
  ) {
    if (!selectedShipping) {
      showToast(
        "Escolha um método de entrega",
        "Selecione como você quer receber seu pedido.",
      );
      return;
    }

    const engravingImageUrl = engravingFile
      ? await uploadEngravingImage(engravingFile)
      : null;

    const { order } = await submitGuestOrder({
      draftCustomerId,
      customer,
      items: toOrderLines(items),
      shipping_method_id: selectedShipping.id,
      payment_method: PAYMENT_METHOD,
      engraving_text: engravingText || null,
      engraving_image_url: engravingImageUrl,
    });

    setLoginDialogOpen(false);
    await finishCheckout(order);
  }

  // Se o login (ou o cadastro) abriu como popup a partir de "Finalizar
  // pedido", retoma o checkout sozinho assim que a sessão aparecer — o
  // cliente não precisa clicar no botão de novo.
  React.useEffect(() => {
    if (session && pendingCheckoutRef.current) {
      pendingCheckoutRef.current = false;
      setLoginDialogOpen(false);
      handleCheckout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, resumeSignal]);

  function handleCloseSuccess() {
    setSuccessOrder(null);
    navigate("/");
  }

  if (items.length === 0 && !successOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-heading text-3xl font-bold text-primary">
          Seu carrinho está vazio
        </h1>
        <p className="mt-2 text-text-muted">
          Explore o catálogo e adicione produtos para vê-los aqui.
        </p>
        <Button asChild className="mt-6">
          <Link to="/produtos">Ver produtos</Link>
        </Button>
      </div>
    );
  }

  const orderSummary = (
    <>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Método de entrega
        </p>
        {loadingShipping ? (
          <p className="mt-2 text-sm text-text-muted">Carregando opções...</p>
        ) : shippingMethods.length === 0 ? (
          <p className="mt-2 text-sm text-accent">
            Nenhum método de entrega disponível no momento.
          </p>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-between gap-3 rounded-brand border border-black/10 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-black/20 data-[state=open]:border-accent"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Truck className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-text">
                      {selectedShipping?.name ?? "Escolha um método"}
                    </span>
                    {selectedShipping && (
                      <span className="block text-xs text-text-muted">
                        {selectedShipping.min_days === selectedShipping.max_days
                          ? `${selectedShipping.min_days} dias`
                          : `${selectedShipping.min_days}–${selectedShipping.max_days} dias`}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {selectedShipping && (
                    <span className="font-semibold text-text">
                      {selectedShipping.price === 0
                        ? "Grátis"
                        : currency.format(selectedShipping.price)}
                    </span>
                  )}
                  <ChevronDown className="size-4 text-text-muted" />
                </span>
              </button>
            </PopoverTrigger>

            <PopoverContent>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-heading text-sm font-semibold text-primary">
                  Escolha a entrega
                </p>
                <PopoverClose
                  aria-label="Fechar"
                  className="rounded-full p-1 text-text-muted transition-colors hover:bg-bg-muted"
                >
                  <X className="size-4" />
                </PopoverClose>
              </div>
              <div className="space-y-2">
                {shippingMethods.map((method) => {
                  const selected = shippingMethodId === method.id;
                  return (
                    <PopoverClose asChild key={method.id}>
                      <button
                        type="button"
                        onClick={() => setShippingMethodId(method.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-brand border px-3 py-2.5 text-left text-sm transition-colors ${
                          selected
                            ? "border-accent bg-accent/10"
                            : "border-black/10 bg-white hover:border-black/20"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Truck
                            className={`size-4 shrink-0 ${selected ? "text-accent" : "text-text-muted"}`}
                          />
                          <span className="min-w-0">
                            <span
                              className={`block truncate font-medium ${selected ? "text-accent" : "text-text"}`}
                            >
                              {method.name}
                            </span>
                            <span className="block text-xs text-text-muted">
                              {method.min_days === method.max_days
                                ? `${method.min_days} dias`
                                : `${method.min_days}–${method.max_days} dias`}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`shrink-0 font-semibold ${selected ? "text-accent" : "text-text"}`}
                        >
                          {method.price === 0 ? "Grátis" : currency.format(method.price)}
                        </span>
                      </button>
                    </PopoverClose>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="space-y-1.5 border-t border-black/10 pt-4 text-sm text-text-muted">
        <div className="flex items-center justify-between gap-2">
          <span>Subtotal</span>
          <span>{currency.format(subtotal)}</span>
        </div>
        {addonsTotal > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span>Adicionais</span>
            <span className="shrink-0 text-accent">+ {currency.format(addonsTotal)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">
            Entrega{selectedShipping ? ` (${selectedShipping.name})` : ""}
          </span>
          <span className="shrink-0">
            {shippingCost === 0 ? "Grátis" : currency.format(shippingCost)}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-2 font-heading text-lg font-bold text-primary">
        <span>Total</span>
        <span>{currency.format(total)}</span>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Você paga com segurança na página do Mercado Pago, escolhendo Pix,
        cartão ou boleto.
      </p>

      <Button
        variant="accent"
        className="mt-5 w-full"
        size="lg"
        onClick={handleCheckout}
        disabled={placing || loadingShipping || !selectedShipping}
      >
        {placing ? "Processando..." : "Finalizar pedido"}
      </Button>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-14 pb-28 sm:px-6 lg:pb-14">
      <h1 className="font-heading text-3xl font-bold text-primary">
        Seu carrinho
      </h1>

      <div className="mt-8 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-10">
        <div className="space-y-8">
        <div className="divide-y divide-black/10 border-y border-black/10">
          {items.map((item: CartItem) => {
            const isCombo = item.kind === "combo";
            const unit = cartItemUnitPrice(item);
            const addonUnit = cartItemAddonUnit(item);
            const onPromo = !isCombo && item.promoPrice != null;
            const referencePrice = onPromo ? item.promoPrice! : item.price;
            const activeTierRow = isCombo ? null : activeTier(item.priceTiers, item.quantity);
            // A faixa só conta quando realmente baixa o preço (o da promoção pode já ser menor).
            const tier =
              activeTierRow && activeTierRow.unit_price < referencePrice ? activeTierRow : null;
            const nextRow = isCombo ? null : nextTier(item.priceTiers, item.quantity);
            const upcoming = nextRow && nextRow.unit_price < unit ? nextRow : null;
            const discounted = unit < item.price;
            return (
            <div key={item.slug} className="flex flex-wrap items-center gap-4 py-5">
              <img
                src={item.image}
                alt={item.name}
                className="size-20 shrink-0 rounded-brand object-cover"
              />
              <div className="min-w-0 flex-1">
                {isCombo ? (
                  <span className="font-heading text-sm font-semibold text-primary">
                    Kit: {item.name}
                  </span>
                ) : (
                  <Link
                    to={`/produto/${item.slug}`}
                    className="font-heading text-sm font-semibold text-primary hover:text-accent"
                  >
                    {item.name}
                  </Link>
                )}
                {isCombo && item.components && (
                  <p className="mt-0.5 text-xs text-text-muted">
                    {item.components.map((c) => `${c.quantity}x ${c.name}`).join(" · ")}
                  </p>
                )}
                <p className="mt-1 text-sm text-text-muted">
                  {discounted && (
                    <span className="mr-1.5 line-through">{currency.format(item.price)}</span>
                  )}
                  <span className={discounted ? "font-semibold text-accent" : ""}>
                    {currency.format(unit)}
                  </span>
                  {isCombo ? " o kit" : " cada"}
                </p>
                {onPromo && (
                  <span className="mr-1.5 mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
                    Promoção
                  </span>
                )}
                {tier && (
                  <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                    Preço progressivo · a partir de {tier.min_qty} un.
                  </span>
                )}
                {upcoming && (
                  <p className="mt-1 text-xs font-medium text-accent">
                    Leve +{upcoming.min_qty - item.quantity} e pague{" "}
                    {currency.format(upcoming.unit_price)} cada
                  </p>
                )}
                <AddonPicker
                  addons={addons}
                  selectedIds={(item.addons ?? []).map((a) => a.id)}
                  quantity={item.quantity}
                  onChange={(selected) => setItemAddons(item.slug, selected)}
                />
              </div>

              <div className="flex basis-full items-center justify-between gap-4 sm:basis-auto sm:justify-end">
                <div className="flex items-center rounded-brand border border-black/10">
                  <button
                    type="button"
                    aria-label="Diminuir"
                    className="flex size-9 items-center justify-center text-primary"
                    onClick={() => setQuantity(item.slug, item.quantity - 1)}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar"
                    className="flex size-9 items-center justify-center text-primary"
                    onClick={() => setQuantity(item.slug, item.quantity + 1)}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <p className="w-20 text-right font-heading text-sm font-bold text-primary">
                  {currency.format((unit + addonUnit) * item.quantity)}
                </p>

                <button
                  type="button"
                  aria-label={`Remover ${item.name}`}
                  className="text-text-muted hover:text-accent"
                  onClick={() => removeItem(item.slug)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            );
          })}
        </div>

        <div className="rounded-brand border border-black/10 bg-white p-5">
          <div className="flex items-center gap-2">
            <PenLine className="size-4 text-accent" />
            <h2 className="font-heading text-sm font-semibold text-primary">
              Gravação personalizada (opcional)
            </h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Quer gravar um nome, frase ou logo na peça? Descreva aqui e, se
            quiser, anexe uma imagem — combinamos os detalhes com você antes
            da produção.
          </p>
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="engraving-text">Texto para gravação</Label>
            <Textarea
              id="engraving-text"
              rows={2}
              placeholder="Ex: nome de família, frase, data..."
              value={engravingText}
              onChange={(e) => setEngravingText(e.target.value)}
            />
          </div>
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="engraving-image">Anexar logo ou imagem de referência</Label>
            <Input
              id="engraving-image"
              type="file"
              accept="image/*"
              onChange={(e) => setEngravingFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        </div>

        <div className="hidden rounded-brand bg-bg-muted p-6 lg:block lg:sticky lg:top-24">
          {orderSummary}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-text-muted">Total</p>
            <p className="font-heading text-lg font-bold text-primary">
              {currency.format(total)}
            </p>
          </div>
          <Button variant="accent" size="lg" onClick={() => setMobileSummaryOpen(true)}>
            Finalizar pedido
          </Button>
        </div>
      </div>

      <Dialog open={mobileSummaryOpen} onOpenChange={setMobileSummaryOpen}>
        <DialogContent className="lg:hidden">
          <DialogHeader>
            <DialogTitle>Resumo do pedido</DialogTitle>
          </DialogHeader>
          {orderSummary}
        </DialogContent>
      </Dialog>

      <Dialog
        open={loginDialogOpen}
        onOpenChange={(open) => {
          setLoginDialogOpen(open);
          if (!open) pendingCheckoutRef.current = false;
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {authMode === "login"
                ? "Entre para continuar"
                : authMode === "registro"
                  ? "Crie sua conta para continuar"
                  : "Complete seus dados para continuar"}
            </DialogTitle>
          </DialogHeader>
          <p className="-mt-2 text-sm text-text-muted">
            {authMode === "login"
              ? "Seu carrinho está te esperando. Entre e seguimos com sua compra."
              : authMode === "registro"
                ? "Só precisamos de alguns dados para criar sua conta e continuar sua compra."
                : "Só precisamos dos seus dados de contato e entrega — sem criar senha."}
          </p>
          {authMode === "login" ? (
            <LoginForm
              idPrefix="cart-login"
              onCreateAccount={() => {
                // Evita que o efeito abaixo dispare o checkout assim que
                // aparecer a sessão do cadastro (antes de criar o cliente).
                pendingCheckoutRef.current = false;
                setAuthMode("registro");
              }}
            />
          ) : authMode === "registro" ? (
            <RegistroForm
              idPrefix="cart-registro"
              redirect={false}
              onSuccess={() => {
                pendingCheckoutRef.current = true;
                setResumeSignal((n) => n + 1);
              }}
              onLoginClick={() => setAuthMode("login")}
            />
          ) : (
            <GuestCheckoutForm
              idPrefix="cart-guest"
              onLoginClick={() => setAuthMode("login")}
              onSubmit={handleGuestCheckout}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!successOrder}
        onOpenChange={(open) => {
          if (!open) handleCloseSuccess();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Pedido confirmado</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-2 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="size-9 text-success" />
            </div>
            <h2 className="mt-4 font-heading text-xl font-bold text-primary">
              Pedido confirmado!
            </h2>
            {successOrder && (
              <p className="mt-1 text-sm text-text-muted">
                Pedido {successOrder.order_number} ·{" "}
                {currency.format(successOrder.total)}
              </p>
            )}
            <p className="mt-3 text-sm text-text-muted">
              Em breve entraremos em contato para combinar o pagamento e a
              entrega.
            </p>
            <Button
              variant="accent"
              className="mt-6 w-full"
              onClick={handleCloseSuccess}
            >
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

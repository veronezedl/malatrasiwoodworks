import { supabase } from "@/lib/supabase";
import type {
  DbOrder,
  DbOrderItem,
  DbOrderStatusEvent,
  DbShippingMethod,
  OrderStatus,
  OrderWithCustomer,
  PaymentMethod,
  PaymentStatus,
} from "@/types/database";
import type { CartItem } from "@/hooks/use-cart";

async function notifyOrderStatus(
  orderId: string,
  status: OrderStatus,
  isNewOrder = false,
) {
  try {
    await supabase.functions.invoke("notify-order-status", {
      body: { orderId, status, isNewOrder },
    });
  } catch {
    // A notificação é best-effort; o pedido/status já ficou salvo.
  }
}

export interface EngravingInput {
  engravingText?: string | null;
  engravingImageUrl?: string | null;
}

export async function uploadEngravingImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("engravings")
    .upload(path, file, { cacheControl: "3600" });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("engravings").getPublicUrl(path);
  return data.publicUrl;
}

// Linhas do pedido enviadas ao servidor (só ids e quantidades — o preço é
// sempre recalculado lá).
export function toOrderLines(items: CartItem[]) {
  return items.map((item) =>
    item.kind === "combo"
      ? { combo_id: item.id, quantity: item.quantity }
      : { product_id: item.id, quantity: item.quantity },
  );
}

// O SDK não expõe a mensagem real da função em error.message (fica
// genérica) — o corpo real da resposta vive em error.context.
export async function functionErrorMessage(error: Error): Promise<string> {
  const context = (error as { context?: Response }).context;
  if (context) {
    try {
      const body = await context.clone().json();
      if (body?.error) return body.error as string;
    } catch {
      // Cai na mensagem genérica abaixo.
    }
  }
  return error.message;
}

// Cliente logado: o servidor (edge function create-order) recalcula preços,
// faixas, kits, adicionais e frete a partir do banco e grava o pedido.
export async function createOrder(
  items: CartItem[],
  addonIds: string[],
  paymentMethod: PaymentMethod,
  shippingMethod: DbShippingMethod,
  engraving?: EngravingInput,
): Promise<DbOrder> {
  const { data, error } = await supabase.functions.invoke("create-order", {
    body: {
      items: toOrderLines(items),
      addon_ids: addonIds,
      shipping_method_id: shippingMethod.id,
      payment_method: paymentMethod,
      engraving_text: engraving?.engravingText || null,
      engraving_image_url: engraving?.engravingImageUrl || null,
    },
  });
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.order) {
    throw new Error(data?.error || "Não foi possível criar o pedido.");
  }
  return data.order as DbOrder;
}

export async function listOrders(): Promise<OrderWithCustomer[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, customer:customers(full_name, email, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrderWithCustomer[];
}

export async function getOrder(id: string): Promise<OrderWithCustomer | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, customer:customers(full_name, email, phone)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as OrderWithCustomer | null;
}

export async function getOrderItems(orderId: string): Promise<DbOrderItem[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (error) throw error;
  return data ?? [];
}

export async function getOrderStatusHistory(
  orderId: string,
): Promise<DbOrderStatusEvent[]> {
  const { data, error } = await supabase
    .from("order_status_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) throw error;

  await notifyOrderStatus(orderId, status);
}

export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: paymentStatus })
    .eq("id", orderId);
  if (error) throw error;
}

// Cria a "preference" de pagamento no Mercado Pago (Checkout Pro) para um
// pedido já existente e devolve a URL pra onde redirecionar o cliente.
export async function createMercadoPagoPreference(
  orderId: string,
): Promise<{ initPoint: string }> {
  const { data, error } = await supabase.functions.invoke(
    "create-mercadopago-preference",
    { body: { orderId } },
  );
  if (error || data?.error) {
    throw new Error(
      data?.error || "Não foi possível iniciar o pagamento online.",
    );
  }
  return { initPoint: data.initPoint as string };
}

export async function updateAdminNotes(
  orderId: string,
  notes: string,
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ admin_notes: notes || null })
    .eq("id", orderId);
  if (error) throw error;
}

export type { DbOrder };

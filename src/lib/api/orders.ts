import { supabase } from "@/lib/supabase";
import type {
  DbCustomer,
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

export async function createOrder(
  customer: DbCustomer,
  items: CartItem[],
  paymentMethod: PaymentMethod,
  shippingMethod: DbShippingMethod,
): Promise<DbOrder> {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal + shippingMethod.price;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      status: "pending",
      payment_method: paymentMethod,
      subtotal,
      shipping_method_id: shippingMethod.id,
      shipping_method_name: shippingMethod.name,
      shipping_cost: shippingMethod.price,
      total,
      shipping_full_name: customer.full_name,
      shipping_phone: customer.phone,
      shipping_address_line1: customer.address_line1,
      shipping_address_line2: customer.address_line2,
      shipping_postal_code: customer.postal_code,
      shipping_city: customer.city,
      shipping_region: customer.region,
      shipping_country_code: customer.country_code,
    })
    .select()
    .single();
  if (orderError || !order) throw orderError ?? new Error("Não foi possível criar o pedido.");

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      unit_price: item.price,
      quantity: item.quantity,
    })),
  );
  if (itemsError) throw itemsError;

  await notifyOrderStatus(order.id, "pending", true);

  return order as DbOrder;
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

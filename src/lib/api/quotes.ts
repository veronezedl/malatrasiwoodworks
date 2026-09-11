import { supabase } from "@/lib/supabase";
import type { DbQuoteRequest, QuoteStatus, QuoteWithCustomer } from "@/types/database";

async function notifyNewQuote(quoteId: string) {
  try {
    await supabase.functions.invoke("notify-new-quote", {
      body: { quoteId },
    });
  } catch {
    // A notificação é best-effort; o pedido de orçamento já ficou salvo.
  }
}

export async function listMyQuoteRequests(): Promise<DbQuoteRequest[]> {
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createQuoteRequest(params: {
  customerId: string;
  description: string;
  woodType?: string | null;
  dimensions?: string | null;
  referenceImageUrl?: string | null;
  budgetHint?: number | null;
}): Promise<DbQuoteRequest> {
  const { data, error } = await supabase
    .from("quote_requests")
    .insert({
      customer_id: params.customerId,
      description: params.description,
      wood_type: params.woodType || null,
      dimensions: params.dimensions || null,
      reference_image_url: params.referenceImageUrl || null,
      budget_hint: params.budgetHint ?? null,
    })
    .select()
    .single();
  if (error || !data)
    throw error ?? new Error("Não foi possível enviar o pedido de orçamento.");

  await notifyNewQuote(data.id);
  return data;
}

export async function uploadQuoteReferenceImage(
  authUserId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${authUserId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("quotes")
    .upload(path, file, { cacheControl: "3600" });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("quotes").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Admin ──────────────────────────────────────────────────────────────

export async function listQuoteRequests(): Promise<QuoteWithCustomer[]> {
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*, customer:customers(full_name, email, phone)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as QuoteWithCustomer[];
}

export async function getQuoteRequest(id: string): Promise<QuoteWithCustomer | null> {
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*, customer:customers(full_name, email, phone)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as QuoteWithCustomer | null;
}

export async function updateQuoteRequest(
  id: string,
  input: Partial<{
    status: QuoteStatus;
    quoted_price: number | null;
    admin_notes: string | null;
  }>,
): Promise<void> {
  const { error } = await supabase.from("quote_requests").update(input).eq("id", id);
  if (error) throw error;
}

// Cria um pedido a partir de um orçamento aprovado, com uma única linha
// (o item personalizado no preço combinado) e marca o orçamento como convertido.
export async function convertQuoteToOrder(
  quote: QuoteWithCustomer,
  customerId: string,
): Promise<string> {
  if (quote.quoted_price == null) {
    throw new Error("Defina o preço do orçamento antes de converter em pedido.");
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();
  if (customerError || !customer) throw customerError ?? new Error("Cliente não encontrado.");

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      status: "pending",
      payment_method: "a_combinar",
      subtotal: quote.quoted_price,
      shipping_cost: 0,
      total: quote.quoted_price,
      shipping_full_name: customer.full_name,
      shipping_phone: customer.phone,
      shipping_address_line1: customer.address_line1,
      shipping_address_line2: customer.address_line2,
      shipping_postal_code: customer.postal_code,
      shipping_city: customer.city,
      shipping_region: customer.region,
      shipping_country_code: customer.country_code,
      admin_notes: `Convertido do orçamento sob encomenda: ${quote.description}`,
    })
    .select()
    .single();
  if (orderError || !order) throw orderError ?? new Error("Não foi possível criar o pedido.");

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: order.id,
    product_id: null,
    product_name: `Sob encomenda: ${quote.description.slice(0, 80)}`,
    unit_price: quote.quoted_price,
    quantity: 1,
  });
  if (itemError) throw itemError;

  await updateQuoteRequest(quote.id, {
    status: "convertido",
    admin_notes: quote.admin_notes ?? undefined,
  });
  await supabase
    .from("quote_requests")
    .update({ converted_order_id: order.id })
    .eq("id", quote.id);

  return order.id as string;
}

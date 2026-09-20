import { supabase } from "@/lib/supabase";
import type { DbOrder, PaymentMethod } from "@/types/database";

export interface GuestCustomerInput {
  full_name: string;
  email: string;
  phone: string;
  cpf_cnpj?: string;
  address_line1: string;
  address_line2?: string;
  address_number?: string;
  neighborhood?: string;
  postal_code: string;
  city: string;
  region?: string;
  country_code: string;
  marketing_opt_in?: boolean;
}

export interface GuestCheckoutInput {
  draftCustomerId: string | null;
  customer: GuestCustomerInput;
  items: { product_id: string; quantity: number }[];
  shipping_method_id: string;
  payment_method: PaymentMethod;
  engraving_text?: string | null;
  engraving_image_url?: string | null;
}

export interface GuestCheckoutResult {
  order: DbOrder;
}

export async function submitGuestOrder(
  input: GuestCheckoutInput,
): Promise<GuestCheckoutResult> {
  const { data, error } = await supabase.functions.invoke("guest-checkout-order", {
    body: input,
  });
  if (error) {
    // O SDK não expõe a mensagem real da função em error.message (fica
    // genérica) — o corpo real da resposta vive em error.context.
    const context = (error as { context?: Response }).context;
    let detailedMessage: string | null = null;
    if (context) {
      try {
        const body = await context.clone().json();
        detailedMessage = body?.error ?? null;
      } catch {
        // Se não for possível ler o context, cai na mensagem genérica abaixo.
      }
    }
    throw new Error(detailedMessage ?? error.message);
  }
  if (!data?.order) {
    throw new Error(data?.error || "Não foi possível concluir o pedido.");
  }
  return { order: data.order as DbOrder };
}

// Autosave do checkout de convidado: salva um só campo (ou alguns poucos)
// assim que o cliente sai dele, sem esperar o botão final. Best-effort — se
// falhar, o dado simplesmente será pedido de novo ao finalizar a compra.
export async function saveGuestDraft(
  draftCustomerId: string | null,
  fields: Partial<GuestCustomerInput>,
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("guest-checkout-draft", {
    body: { draftCustomerId, fields },
  });
  if (error) return draftCustomerId;
  return (data?.draftCustomerId as string | undefined) ?? draftCustomerId;
}

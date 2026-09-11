export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  processing: "Em produção",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export type PaymentMethod = "pix" | "transferencia" | "dinheiro" | "a_combinar";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  transferencia: "Transferência bancária",
  dinheiro: "Dinheiro",
  a_combinar: "A combinar",
};

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "pix",
  "transferencia",
  "dinheiro",
  "a_combinar",
];

export type PaymentStatus = "pending" | "paid";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
};

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["pending", "paid"];

export interface DbCustomer {
  id: string;
  auth_user_id: string | null;
  // Nulos quando o registro é um "pré-cadastro" de checkout de convidado
  // ainda incompleto (ver GuestCheckoutForm/autosave) — um cliente
  // totalmente cadastrado sempre os tem preenchidos.
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  region: string | null;
  country_code: string;
  marketing_opt_in: boolean;
  avatar_url: string | null;
  invited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image_url: string;
  description: string;
  wood_type: string | null;
  is_custom_order: boolean;
  active: boolean;
  featured: boolean;
  visible_in_store: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_method_id: string | null;
  shipping_method_name: string | null;
  shipping_cost: number;
  total: number;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_postal_code: string;
  shipping_city: string;
  shipping_region: string | null;
  shipping_country_code: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface DbOrderStatusEvent {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  notified_email: boolean;
  created_at: string;
}

export interface OrderWithCustomer extends DbOrder {
  customer: Pick<DbCustomer, "full_name" | "email" | "phone">;
}

export type SupportRequestStatus = "open" | "in_progress" | "resolved";

export const SUPPORT_REQUEST_STATUS_LABELS: Record<SupportRequestStatus, string> = {
  open: "Aberta",
  in_progress: "Em andamento",
  resolved: "Resolvida",
};

export interface DbSupportRequest {
  id: string;
  customer_id: string;
  order_id: string | null;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  created_at: string;
  updated_at: string;
}

export type QuoteStatus =
  | "novo"
  | "em_analise"
  | "orcamento_enviado"
  | "aprovado"
  | "recusado"
  | "convertido";

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  orcamento_enviado: "Orçamento enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  convertido: "Convertido em pedido",
};

export const QUOTE_STATUS_OPTIONS: QuoteStatus[] = [
  "novo",
  "em_analise",
  "orcamento_enviado",
  "aprovado",
  "recusado",
  "convertido",
];

export interface DbQuoteRequest {
  id: string;
  customer_id: string;
  description: string;
  wood_type: string | null;
  dimensions: string | null;
  reference_image_url: string | null;
  budget_hint: number | null;
  status: QuoteStatus;
  quoted_price: number | null;
  admin_notes: string | null;
  converted_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteWithCustomer extends DbQuoteRequest {
  customer: Pick<DbCustomer, "full_name" | "email" | "phone">;
}

export interface DbProductReview {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_city: string | null;
  customer_country: string | null;
  product_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface PublicReview extends DbProductReview {
  product: { slug: string; name: string; image_url: string } | null;
}

export interface DbShippingMethod {
  id: string;
  name: string;
  min_days: number;
  max_days: number;
  price: number;
  active: boolean;
  visible_in_store: boolean;
  created_at: string;
  updated_at: string;
}

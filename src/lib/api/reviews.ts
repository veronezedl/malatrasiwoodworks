import { supabase } from "@/lib/supabase";
import type { DbProductReview, PublicReview } from "@/types/database";

export interface ReviewableItem {
  productId: string;
  productName: string;
  imageUrl: string | null;
  orderId: string;
  orderNumber: string;
}

interface DeliveredOrderRow {
  id: string;
  order_number: string;
  order_items: {
    product_id: string | null;
    product_name: string;
    product: { image_url: string } | null;
  }[];
}

export interface ProductReviewSummary {
  reviews: DbProductReview[];
  average: number;
  total: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

// Nome de exibição público e respeitoso da privacidade: "Dhionatan V."
export function toDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function listMyReviews(customerId: string): Promise<DbProductReview[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchReviewableItems(
  customerId: string,
): Promise<ReviewableItem[]> {
  const [ordersRes, reviewsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, order_items(product_id, product_name, product:products(image_url))")
      .eq("customer_id", customerId)
      .eq("status", "delivered"),
    supabase.from("product_reviews").select("product_id").eq("customer_id", customerId),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  const reviewedIds = new Set((reviewsRes.data ?? []).map((r) => r.product_id));
  const seen = new Set<string>();
  const items: ReviewableItem[] = [];

  for (const order of (ordersRes.data ?? []) as unknown as DeliveredOrderRow[]) {
    for (const item of order.order_items ?? []) {
      if (!item.product_id) continue;
      if (reviewedIds.has(item.product_id) || seen.has(item.product_id)) continue;
      seen.add(item.product_id);
      items.push({
        productId: item.product_id,
        productName: item.product_name,
        imageUrl: item.product?.image_url ?? null,
        orderId: order.id,
        orderNumber: order.order_number,
      });
    }
  }

  return items;
}

export async function createReview(params: {
  customerId: string;
  customerName: string;
  customerCity?: string | null;
  customerCountry?: string | null;
  productId: string;
  orderId: string;
  rating: number;
  comment: string;
}): Promise<DbProductReview> {
  const { data, error } = await supabase
    .from("product_reviews")
    .insert({
      customer_id: params.customerId,
      customer_name: toDisplayName(params.customerName),
      customer_city: params.customerCity || null,
      customer_country: params.customerCountry || null,
      product_id: params.productId,
      order_id: params.orderId,
      rating: params.rating,
      comment: params.comment || null,
    })
    .select()
    .single();
  if (error || !data)
    throw error ?? new Error("Não foi possível enviar a avaliação.");
  return data;
}

export async function fetchPublicReviews(limit = 12): Promise<PublicReview[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*, product:products(slug, name, image_url)")
    .not("comment", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as PublicReview[];
}

export async function fetchProductReviews(
  productId: string,
): Promise<ProductReviewSummary> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const reviews = data ?? [];
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const r of reviews) {
    const rating = r.rating as 1 | 2 | 3 | 4 | 5;
    if (distribution[rating] !== undefined) distribution[rating] += 1;
  }
  const total = reviews.length;
  const average = total
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
    : 0;

  return { reviews, average, total, distribution };
}

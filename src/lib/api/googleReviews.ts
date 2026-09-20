import { supabase } from "@/lib/supabase";

export interface GoogleReview {
  author: string;
  authorUrl: string | null;
  photo: string | null;
  rating: number;
  text: string;
  when: string;
  publishedAt: string | null;
}

export interface GoogleReviewsData {
  configured: boolean;
  rating: number | null;
  count: number;
  url: string | null;
  reviews: GoogleReview[];
}

// Nota e avaliações do perfil da empresa no Google (edge function
// google-reviews). Sem credenciais configuradas volta { configured: false }.
export async function fetchGoogleReviews(): Promise<GoogleReviewsData> {
  const { data, error } = await supabase.functions.invoke("google-reviews");
  if (error || !data) throw error ?? new Error("Sem resposta do Google.");
  return data as GoogleReviewsData;
}

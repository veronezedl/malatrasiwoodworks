// Supabase Edge Function: google-reviews
//
// Busca a nota e as avaliações do perfil da Malatrasi WoodWorks no Google
// (Places API "New") para a seção de avaliações do site. A chave fica só aqui
// no servidor. Guarda o resultado em memória por 1 hora para não gastar cota
// da API a cada visita. Sem credenciais configuradas devolve
// { configured: false } e o site mostra apenas as avaliações próprias.
//
// Secrets necessárias (Project Settings → Edge Functions → Secrets):
//   GOOGLE_PLACES_API_KEY  chave de API com "Places API (New)" habilitada
//   GOOGLE_PLACE_ID        Place ID do perfil da empresa no Google

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { at: number; body: unknown } | null = null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface GoogleReview {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  const placeId = Deno.env.get("GOOGLE_PLACE_ID");
  if (!apiKey || !placeId) {
    return json({ configured: false, reviews: [] });
  }

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return json(cache.body);
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pt-BR`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "displayName,rating,userRatingCount,googleMapsUri,reviews",
        },
      },
    );
    if (!res.ok) {
      return json({ configured: true, reviews: [], error: `Google respondeu ${res.status}` }, 502);
    }
    const place = await res.json();

    const body = {
      configured: true,
      rating: typeof place.rating === "number" ? place.rating : null,
      count: typeof place.userRatingCount === "number" ? place.userRatingCount : 0,
      url: place.googleMapsUri ?? null,
      reviews: ((place.reviews ?? []) as GoogleReview[]).map((r) => ({
        author: r.authorAttribution?.displayName ?? "Cliente do Google",
        authorUrl: r.authorAttribution?.uri ?? null,
        photo: r.authorAttribution?.photoUri ?? null,
        rating: r.rating ?? 0,
        text: r.text?.text ?? r.originalText?.text ?? "",
        when: r.relativePublishTimeDescription ?? "",
        publishedAt: r.publishTime ?? null,
      })),
    };
    cache = { at: Date.now(), body };
    return json(body);
  } catch (err) {
    return json(
      { configured: true, reviews: [], error: err instanceof Error ? err.message : "Erro desconhecido" },
      502,
    );
  }
});

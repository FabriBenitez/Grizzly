import { supabase } from "../lib/supabase";
import { getActiveDefaultHeroSlides, getDefaultHeroSlides, normalizeHeroSlide } from "./heroSlides";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase no esta configurado. Completa VITE_SUPABASE_URL y la clave publica en .env.local.",
    );
  }

  return supabase;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function mapHeroBannerRowToSlide(row, index = 0) {
  return normalizeHeroSlide(
    {
      id: normalizeText(row?.id),
      image: normalizeText(row?.image_url),
      title: normalizeText(row?.title),
      description: normalizeText(row?.subtitle),
      ctaLabel: normalizeText(row?.cta_label),
      ctaHref: normalizeText(row?.cta_href),
      showOverlay: Boolean(row?.title || row?.subtitle || row?.cta_label),
      active: Boolean(row?.is_active),
      order: Number(row?.sort_order || index + 1),
    },
    index,
  );
}

function mapDraftToHeroBannerPayload(draft) {
  return {
    id: normalizeText(draft?.id) || undefined,
    title: normalizeText(draft?.title) || "Banner principal",
    subtitle: normalizeText(draft?.subtitle) || null,
    image_url: normalizeText(draft?.image) || null,
    cta_label: normalizeText(draft?.ctaLabel) || null,
    cta_href: normalizeText(draft?.ctaHref) || null,
    sort_order: Math.max(1, Number(draft?.order || 1)),
    is_active: Boolean(draft?.active),
  };
}

export async function fetchHeroSlidesFromSupabase({ includeInactive = false } = {}) {
  const client = requireSupabase();
  let query = client.from("hero_banners").select("*").order("sort_order", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "No pudimos cargar los banners del hero desde la base.");
  }

  const slides = (data || []).map((row, index) => mapHeroBannerRowToSlide(row, index));
  if (!slides.length) {
    return includeInactive ? getDefaultHeroSlides() : getActiveDefaultHeroSlides();
  }

  return slides;
}

export async function upsertHeroBanner(draft) {
  const client = requireSupabase();
  const payload = mapDraftToHeroBannerPayload(draft);

  const { error } = await client.from("hero_banners").upsert(payload).select("id");

  if (error) {
    throw new Error(error.message || "No pudimos guardar el banner del hero.");
  }
}

export async function deleteHeroBanner(id) {
  const client = requireSupabase();
  const safeId = normalizeText(id);
  if (!safeId) {
    return;
  }

  const { error } = await client.from("hero_banners").delete().eq("id", safeId);
  if (error) {
    throw new Error(error.message || "No pudimos eliminar el banner del hero.");
  }
}

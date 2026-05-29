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
  const payload = {
    title: normalizeText(draft?.title) || "Banner principal",
    subtitle: normalizeText(draft?.subtitle) || null,
    image_url: normalizeText(draft?.image) || null,
    cta_label: normalizeText(draft?.ctaLabel) || null,
    cta_href: normalizeText(draft?.ctaHref) || null,
    sort_order: Math.max(1, Number(draft?.order || 1)),
    is_active: Boolean(draft?.active),
  };
  
  const id = normalizeText(draft?.id);
  if (id) {
    payload.id = id;
  }
  
  return payload;
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
  return slides;
}

export async function upsertHeroBanner(draft) {
  const client = requireSupabase();
  const payload = mapDraftToHeroBannerPayload(draft);

  let error;
  // Validar que el ID sea un UUID valido para evitar errores 400
  const isUUID = payload.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.id);

  if (isUUID) {
    const { id, ...updatePayload } = payload;
    const { error: updateError } = await client.from("hero_banners").update(updatePayload).eq("id", id).select("id");
    error = updateError;
  } else {
    // Es un slide default local (ej: "hero-sale-1") o nuevo, lo insertamos sin id
    const { id, ...insertPayload } = payload;
    const { error: insertError } = await client.from("hero_banners").insert([insertPayload]).select("id");
    error = insertError;
  }

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

export async function uploadHeroImage(file) {
  const client = requireSupabase();
  if (!file) return null;

  const rawName = normalizeText(file.name) || "banner";
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const path = `hero_banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error: uploadError } = await client.storage.from("products").upload(path, file, {
    upsert: false,
    cacheControl: "3600",
  });

  if (uploadError) {
    throw new Error(uploadError.message || "No pudimos subir la imagen del banner.");
  }

  const {
    data: { publicUrl },
  } = client.storage.from("products").getPublicUrl(path);

  return publicUrl;
}

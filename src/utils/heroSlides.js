import { heroPromoSlides } from "../data/homePromos";

export const HERO_SLIDES_STORAGE_KEY = "grizzly_hero_slides";

export function normalizeHeroSlide(slide, index = 0) {
  const hasOverlayContent = Boolean(
    slide.kicker ||
      slide.titleLead ||
      slide.titleHighlight ||
      slide.titleTail ||
      slide.description ||
      slide.badges?.length ||
      slide.stats?.length,
  );
  const showOverlay = slide.showOverlay ?? hasOverlayContent;

  return {
    id: slide.id || `hero_${Date.now()}_${index}`,
    image: slide.image || "/assets/products/combo-estrella.jpg",
    kicker: showOverlay ? slide.kicker || "Grizzly suplementos" : slide.kicker || "",
    titleLead: showOverlay ? slide.titleLead || "Encontra" : slide.titleLead || "",
    titleHighlight: showOverlay ? slide.titleHighlight || "productos" : slide.titleHighlight || "",
    titleTail: showOverlay ? slide.titleTail || "destacados" : slide.titleTail || "",
    description: showOverlay
      ? slide.description || "Banner principal editable desde el panel admin."
      : slide.description || "",
    badges: Array.isArray(slide.badges) ? slide.badges.filter(Boolean) : [],
    stats: Array.isArray(slide.stats) ? slide.stats.filter(Boolean) : [],
    showOverlay,
    active: slide.active ?? true,
    order: Number.isFinite(Number(slide.order)) ? Number(slide.order) : index + 1,
  };
}

export function normalizeHeroSlides(slides = heroPromoSlides) {
  return slides
    .map((slide, index) => normalizeHeroSlide(slide, index))
    .sort((a, b) => a.order - b.order);
}

export function readHeroSlides() {
  try {
    const raw = window.localStorage.getItem(HERO_SLIDES_STORAGE_KEY);
    if (!raw) {
      return normalizeHeroSlides(heroPromoSlides);
    }

    const parsed = JSON.parse(raw);
    return normalizeHeroSlides(parsed);
  } catch {
    return normalizeHeroSlides(heroPromoSlides);
  }
}

export function getActiveHeroSlides() {
  const slides = readHeroSlides().filter((slide) => slide.active);
  return slides.length ? slides : normalizeHeroSlides(heroPromoSlides).filter((slide) => slide.active);
}

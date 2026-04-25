import { heroPromoSlides } from "../data/homePromos";

export const HERO_SLIDES_STORAGE_KEY = "grizzly_hero_slides";

export function normalizeHeroSlide(slide, index = 0) {
  return {
    id: slide.id || `hero_${Date.now()}_${index}`,
    image: slide.image || "/assets/products/combo-estrella.jpg",
    kicker: slide.kicker || "Grizzly suplementos",
    titleLead: slide.titleLead || "Encontra",
    titleHighlight: slide.titleHighlight || "productos",
    titleTail: slide.titleTail || "destacados",
    description: slide.description || "Banner principal editable desde el panel admin.",
    badges: Array.isArray(slide.badges) ? slide.badges.filter(Boolean) : [],
    stats: Array.isArray(slide.stats) ? slide.stats.filter(Boolean) : [],
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

import { heroPromoSlides } from "../data/homePromos";

export function normalizeHeroSlide(slide, index = 0) {
  const computedTitle =
    (typeof slide.title === "string" ? slide.title.trim() : "") ||
    [slide.titleLead, slide.titleHighlight, slide.titleTail]
      .filter(Boolean)
      .join(" ")
      .trim();

  const hasOverlayContent = Boolean(
    computedTitle ||
      slide.kicker ||
      slide.description ||
      slide.badges?.length ||
      slide.stats?.length ||
      slide.ctaLabel,
  );
  const showOverlay = slide.showOverlay ?? hasOverlayContent;

  return {
    id: slide.id || `hero_${Date.now()}_${index}`,
    image: slide.image || "/assets/products/combo-estrella.jpg",
    title: computedTitle,
    kicker: showOverlay ? slide.kicker || "Grizzly suplementos" : slide.kicker || "",
    titleLead: showOverlay ? slide.titleLead || "" : slide.titleLead || "",
    titleHighlight: showOverlay ? slide.titleHighlight || "" : slide.titleHighlight || "",
    titleTail: showOverlay ? slide.titleTail || "" : slide.titleTail || "",
    description: showOverlay
      ? slide.description || "Banner principal editable desde el panel admin."
      : slide.description || "",
    badges: Array.isArray(slide.badges) ? slide.badges.filter(Boolean) : [],
    stats: Array.isArray(slide.stats) ? slide.stats.filter(Boolean) : [],
    ctaLabel: typeof slide.ctaLabel === "string" ? slide.ctaLabel.trim() : "",
    ctaHref: typeof slide.ctaHref === "string" ? slide.ctaHref.trim() : "",
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

export function getDefaultHeroSlides() {
  return normalizeHeroSlides(heroPromoSlides);
}

export function getActiveDefaultHeroSlides() {
  return getDefaultHeroSlides().filter((slide) => slide.active);
}

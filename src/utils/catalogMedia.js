const placeholderSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" fill="none">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f3ece6" />
        <stop offset="100%" stop-color="#e6dbd2" />
      </linearGradient>
    </defs>
    <rect width="1200" height="1200" rx="80" fill="url(#bg)" />
    <rect x="180" y="240" width="840" height="720" rx="48" fill="#ffffff" fill-opacity="0.84" />
    <circle cx="430" cy="500" r="84" fill="#c38b5c" fill-opacity="0.3" />
    <path d="M330 780l164-188c18-21 50-23 71-5l92 79 112-132c20-24 57-24 78 0l153 176H330z" fill="#b56a3d" fill-opacity="0.28" />
    <text x="50%" y="55%" text-anchor="middle" fill="#6a4b3f" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700">
      Imagen pendiente
    </text>
  </svg>
`.trim();

export const CATALOG_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(placeholderSvg)}`;

function normalizeCatalogImage(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isCatalogPlaceholderImage(value) {
  return normalizeCatalogImage(value) === CATALOG_IMAGE_PLACEHOLDER;
}

export function sanitizeCatalogGallery(gallery) {
  if (!Array.isArray(gallery)) {
    return [];
  }

  return gallery
    .map((image) => normalizeCatalogImage(image))
    .filter((image) => image && !isCatalogPlaceholderImage(image));
}

export function resolveCatalogMedia(image, gallery) {
  const sanitizedGallery = sanitizeCatalogGallery(gallery);
  const normalizedImage = normalizeCatalogImage(image);
  const primaryImage =
    (!isCatalogPlaceholderImage(normalizedImage) && normalizedImage) ||
    sanitizedGallery[0] ||
    CATALOG_IMAGE_PLACEHOLDER;

  return {
    image: primaryImage,
    gallery: sanitizedGallery,
    hasRealImages: sanitizedGallery.length > 0 || Boolean(normalizedImage && !isCatalogPlaceholderImage(normalizedImage)),
  };
}

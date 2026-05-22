import {
  brands as baseBrands,
  categories as baseCategories,
  objectives as baseObjectives,
  products as baseProducts,
} from "../data/products";
import { resolveCatalogMedia } from "./catalogMedia";

export const CATALOG_PRODUCTS_STORAGE_KEY = "grizzly_catalog_products_mp_test_v1";
export const CATALOG_PRODUCTS_EVENT = "grizzly:catalog-products-updated";

function normalizeCatalogText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getUniqueCatalogValues(source, field) {
  const items = Array.isArray(source) && source.length ? source : createCatalogSeed();
  const unique = new Map();

  items.forEach((item) => {
    const value = normalizeCatalogText(item?.[field]);
    if (!value) {
      return;
    }

    const key = value.toLocaleLowerCase("es-AR");
    if (!unique.has(key)) {
      unique.set(key, value);
    }
  });

  return [...unique.values()].sort((left, right) =>
    left.localeCompare(right, "es", { sensitivity: "base" }),
  );
}

function normalizeCatalogProduct(product, index, fallback = {}) {
  const merged = { ...fallback, ...product };
  const media = resolveCatalogMedia(product?.image, product?.gallery);

  return {
    ...merged,
    sku: merged.sku || fallback.sku || `SKU-${String(index + 1).padStart(4, "0")}`,
    name: normalizeCatalogText(merged.name) || normalizeCatalogText(fallback.name),
    brand: normalizeCatalogText(merged.brand) || normalizeCatalogText(fallback.brand),
    category: normalizeCatalogText(merged.category) || normalizeCatalogText(fallback.category),
    objective: normalizeCatalogText(merged.objective) || normalizeCatalogText(fallback.objective),
    active: typeof merged.active === "boolean" ? merged.active : true,
    highlighted:
      typeof merged.highlighted === "boolean"
        ? merged.highlighted
        : Boolean(merged.featured || fallback.highlighted),
    image: media.image,
    gallery: media.gallery,
    description:
      merged.description?.trim() ||
      fallback.description ||
      "Producto disponible en el catalogo de Grizzly suplementos.",
  };
}

export function createCatalogSeed() {
  return baseProducts.map((product, index) => normalizeCatalogProduct(product, index, product));
}

export function readCatalogProducts() {
  if (typeof window === "undefined") {
    return createCatalogSeed();
  }

  try {
    const raw = window.localStorage.getItem(CATALOG_PRODUCTS_STORAGE_KEY);
    if (!raw) {
      return createCatalogSeed();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return createCatalogSeed();
    }

    return parsed.map((product, index) => normalizeCatalogProduct(product, index));
  } catch {
    return createCatalogSeed();
  }
}

export function saveCatalogProducts(products) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const normalized = products.map((product, index) => normalizeCatalogProduct(product, index));

    window.localStorage.setItem(CATALOG_PRODUCTS_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new window.Event(CATALOG_PRODUCTS_EVENT));
  } catch {
    // Silencioso: si localStorage falla no bloquea la UI.
  }
}

export function getCatalogCategories(products) {
  return getUniqueCatalogValues(products, "category");
}

export function getCatalogBrands(products) {
  return getUniqueCatalogValues(products, "brand");
}

export function getCatalogObjectives(products) {
  return getUniqueCatalogValues(products, "objective");
}

export const catalogSeedMeta = {
  categories: baseCategories,
  brands: baseBrands,
  objectives: baseObjectives,
};

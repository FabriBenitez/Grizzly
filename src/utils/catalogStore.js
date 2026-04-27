import {
  brands as baseBrands,
  categories as baseCategories,
  objectives as baseObjectives,
  products as baseProducts,
} from "../data/products";

export const CATALOG_PRODUCTS_STORAGE_KEY = "grizzly_catalog_products";
export const CATALOG_PRODUCTS_EVENT = "grizzly:catalog-products-updated";

function normalizeCatalogProduct(product, index, fallback = {}) {
  const merged = { ...fallback, ...product };
  const image =
    merged.image || merged.gallery?.[0] || fallback.image || "/assets/products/creatina-300-bag.jpg";
  const gallery = Array.isArray(merged.gallery) && merged.gallery.length ? merged.gallery : [image];

  return {
    ...merged,
    sku: merged.sku || fallback.sku || `SKU-${String(index + 1).padStart(4, "0")}`,
    active: typeof merged.active === "boolean" ? merged.active : true,
    highlighted:
      typeof merged.highlighted === "boolean"
        ? merged.highlighted
        : Boolean(merged.featured || fallback.highlighted),
    image,
    gallery,
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

    return parsed.map((product, index) => {
      const fallback = baseProducts.find((item) => item.id === product.id) || {};
      return normalizeCatalogProduct(product, index, fallback);
    });
  } catch {
    return createCatalogSeed();
  }
}

export function saveCatalogProducts(products) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const normalized = products.map((product, index) => {
      const fallback = baseProducts.find((item) => item.id === product.id) || {};
      return normalizeCatalogProduct(product, index, fallback);
    });

    window.localStorage.setItem(CATALOG_PRODUCTS_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new window.Event(CATALOG_PRODUCTS_EVENT));
  } catch {
    // Silencioso: si localStorage falla no bloquea la UI.
  }
}

export function getCatalogCategories(products) {
  const source = products?.length ? products : createCatalogSeed();
  return [...new Set(source.map((product) => product.category).filter(Boolean))];
}

export function getCatalogBrands(products) {
  const source = products?.length ? products : createCatalogSeed();
  return [...new Set(source.map((product) => product.brand).filter(Boolean))];
}

export function getCatalogObjectives(products) {
  const source = products?.length ? products : createCatalogSeed();
  return [...new Set(source.map((product) => product.objective).filter(Boolean))];
}

export const catalogSeedMeta = {
  categories: baseCategories,
  brands: baseBrands,
  objectives: baseObjectives,
};

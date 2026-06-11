import { supabase } from "../lib/supabase";
import { readCatalogProducts, saveCatalogProducts } from "./catalogStore";
import {
  CATALOG_IMAGE_PLACEHOLDER,
  isCatalogPlaceholderImage,
  resolveCatalogMedia,
  sanitizeCatalogGallery,
} from "./catalogMedia";

export const CATALOG_PRODUCT_SELECT = `
  id,
  category_id,
  brand_id,
  name,
  slug,
  short_description,
  description,
  sku,
  price,
  promo_price,
  transfer_price,
  stock,
  is_active,
  is_featured,
  created_at,
  updated_at,
  categories (
    id,
    name,
    slug
  ),
  brands (
    id,
    name,
    slug
  ),
  product_images (
    id,
    storage_path,
    public_url,
    alt_text,
    sort_order,
    created_at
  )
`;

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

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed) : 0;
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function normalizeEntityName(name) {
  return normalizeText(name);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalizeText(value),
  );
}

function pickRelation(relation) {
  if (Array.isArray(relation)) {
    return relation[0] || null;
  }

  return relation || null;
}

function buildShortDescription(description) {
  const normalized = normalizeText(description);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 160);
}

function normalizeGalleryImages(images, productName) {
  const sorted = Array.isArray(images)
    ? [...images].sort((left, right) => (left?.sort_order || 0) - (right?.sort_order || 0))
    : [];

  const gallery = sanitizeCatalogGallery(
    sorted.map((image) => normalizeText(image?.public_url || image?.storage_path)),
  );
  const media = resolveCatalogMedia(gallery[0], gallery);

  return {
    image: media.image,
    gallery: media.gallery,
    altText: normalizeText(sorted[0]?.alt_text) || normalizeText(productName),
  };
}

function extractMetadata(description) {
  const normalized = normalizeText(description);
  const parts = normalized.split("---META---");
  const cleanDescription = parts[0].trim();
  let meta = { combo: false, tags: "", promo: false };
  
  if (parts.length > 1) {
    try {
      meta = { ...meta, ...JSON.parse(parts[1].trim()) };
    } catch (e) {
      // Ignorar json invalido
    }
  }
  
  return { cleanDescription, meta };
}

export function normalizeRemoteCatalogProduct(row) {
  const category = pickRelation(row?.categories);
  const brand = pickRelation(row?.brands);
  const visual = normalizeGalleryImages(row?.product_images, row?.name);
  const promoPrice = row?.promo_price == null ? null : normalizeNumber(row.promo_price);
  const { cleanDescription, meta } = extractMetadata(row?.description);

  return {
    id: normalizeText(row?.id),
    slug: normalizeText(row?.slug),
    sku: normalizeText(row?.sku) || `SKU-${normalizeText(row?.id).slice(0, 8).toUpperCase()}`,
    name: normalizeText(row?.name),
    brand: normalizeText(brand?.name) || "Sin marca",
    category: normalizeText(category?.name) || "Sin categoria",
    objective: "General",
    price: normalizeNumber(row?.price),
    promoPrice,
    transferPrice:
      row?.transfer_price == null ? null : normalizeNumber(row.transfer_price),
    rating: 0,
    reviews: 0,
    stock: Math.max(0, Math.round(normalizeNumber(row?.stock))),
    sold: 0,
    featured: Boolean(row?.is_featured),
    promo: promoPrice != null && promoPrice > 0 || Boolean(meta.promo) || Boolean(meta.combo),
    combo: Boolean(meta.combo),
    searchTags: meta.tags || "",
    active: Boolean(row?.is_active),
    highlighted: Boolean(row?.is_featured),
    image: visual.image,
    gallery: visual.gallery,
    description: cleanDescription ||
      normalizeText(row?.short_description) ||
      "Producto disponible en el catalogo de Grizzly suplementos.",
    _db: {
      id: normalizeText(row?.id),
      categoryId: normalizeText(row?.category_id),
      brandId: normalizeText(row?.brand_id),
      altText: visual.altText,
    },
  };
}

async function ensureNamedEntities(table, names) {
  const client = requireSupabase();
  const entries = [...new Map(
    names
      .map((name) => normalizeEntityName(name))
      .filter(Boolean)
      .map((name) => [slugify(name), { name, slug: slugify(name) }]),
  ).values()];

  if (!entries.length) {
    return new Map();
  }

  const slugs = entries.map((entry) => entry.slug);
  const { data: existing, error: existingError } = await client
    .from(table)
    .select("id, name, slug")
    .in("slug", slugs);

  if (existingError) {
    throw new Error(existingError.message || `No pudimos consultar ${table}.`);
  }

  const existingBySlug = new Map((existing || []).map((item) => [item.slug, item]));
  const missing = entries
    .filter((entry) => !existingBySlug.has(entry.slug))
    .map((entry) => ({
      name: entry.name,
      slug: entry.slug,
      is_active: true,
    }));

  let inserted = [];

  if (missing.length) {
    const { data: insertedRows, error: insertError } = await client
      .from(table)
      .upsert(missing, { onConflict: "slug" })
      .select("id, name, slug");

    if (insertError) {
      throw new Error(insertError.message || `No pudimos guardar ${table}.`);
    }

    inserted = insertedRows || [];
  }

  return new Map(
    [...(existing || []), ...inserted].map((item) => [slugify(item.name), item.id]),
  );
}

function buildProductPayload(product, categoryIdMap, brandIdMap) {
  const normalizedName = normalizeText(product?.name);
  let description = normalizeText(product?.description) || "";
  
  if (product?.combo || product?.searchTags || product?.promo) {
    const meta = {};
    if (product?.combo) meta.combo = true;
    if (product?.promo) meta.promo = true;
    if (product?.searchTags) meta.tags = product.searchTags;
    // Evitar duplicar el meta si ya lo trajo
    description = description.split("---META---")[0].trim();
    description += `\n\n---META---\n${JSON.stringify(meta)}`;
  }

  const categoryKey = slugify(product?.category);
  const brandKey = slugify(product?.brand);

  return {
    category_id: categoryIdMap.get(categoryKey) || null,
    brand_id: brandIdMap.get(brandKey) || null,
    name: normalizedName,
    slug: slugify(product?.slug || normalizedName) || `producto-${Date.now()}`,
    short_description: buildShortDescription(description.split("---META---")[0].trim()),
    description: description || null,
    sku: normalizeText(product?.sku) || null,
    price: normalizeNumber(product?.price),
    promo_price:
      product?.promoPrice == null || product?.promoPrice === ""
        ? null
        : normalizeNumber(product.promoPrice),
    transfer_price:
      product?.transferPrice == null || product?.transferPrice === ""
        ? null
        : normalizeNumber(product.transferPrice),
    stock: Math.max(0, Math.round(normalizeNumber(product?.stock))),
    is_active: typeof product?.active === "boolean" ? product.active : true,
    is_featured:
      typeof product?.highlighted === "boolean"
        ? product.highlighted
        : Boolean(product?.featured),
  };
}

function getProductImagesPayload(productId, product) {
  const gallery = sanitizeCatalogGallery(product?.gallery);
  const standaloneImage = normalizeText(product?.image);
  const normalizedImages = gallery.length
    ? gallery
    : standaloneImage &&
        standaloneImage !== CATALOG_IMAGE_PLACEHOLDER &&
        !isCatalogPlaceholderImage(standaloneImage)
      ? [standaloneImage]
      : [];

  return normalizedImages
    .map((image) => normalizeText(image))
    .filter(Boolean)
    .map((image, index) => ({
      product_id: productId,
      storage_path: image,
      public_url: image,
      alt_text: normalizeText(product?.name) || "Producto Grizzly",
      sort_order: index,
    }));
}

async function syncProductImages(productId, product) {
  const client = requireSupabase();
  const { error: deleteError } = await client.from("product_images").delete().eq("product_id", productId);

  if (deleteError) {
    throw new Error(deleteError.message || "No pudimos actualizar la galeria del producto.");
  }

  const payload = getProductImagesPayload(productId, product);
  if (!payload.length) {
    return;
  }

  const { error: insertError } = await client.from("product_images").insert(payload);

  if (insertError) {
    throw new Error(insertError.message || "No pudimos guardar las imagenes del producto.");
  }
}

export async function fetchAdminCatalogFromSupabase() {
  return fetchCatalogFromSupabase();
}

export async function fetchCatalogFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("products")
    .select(CATALOG_PRODUCT_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No pudimos cargar el catalogo desde la base.");
  }

  const normalized = (data || []).map(normalizeRemoteCatalogProduct);
  if (normalized.length) {
    saveCatalogProducts(normalized);
  }

  return normalized;
}

async function fetchNamedEntitiesFromSupabase(table) {
  const client = requireSupabase();
  const { data, error } = await client
    .from(table)
    .select("id, name, slug, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message || `No pudimos cargar ${table} desde la base.`);
  }

  return (data || []).map((row) => ({
    id: normalizeText(row?.id),
    name: normalizeEntityName(row?.name),
    slug: normalizeText(row?.slug),
  }));
}

export async function fetchCatalogCategoriesFromSupabase() {
  return fetchNamedEntitiesFromSupabase("categories");
}

export async function fetchCatalogBrandsFromSupabase() {
  return fetchNamedEntitiesFromSupabase("brands");
}

export async function saveAdminCatalogProducts(products) {
  const client = requireSupabase();
  const source = Array.isArray(products) ? products : [];

  const categoryIdMap = await ensureNamedEntities(
    "categories",
    source.map((product) => product.category),
  );
  const brandIdMap = await ensureNamedEntities(
    "brands",
    source.map((product) => product.brand),
  );

  const { data: currentRows, error: currentError } = await client
    .from("products")
    .select("id, slug, sku");

  if (currentError) {
    throw new Error(currentError.message || "No pudimos preparar la sincronizacion del catalogo.");
  }

  const currentById = new Map((currentRows || []).map((row) => [normalizeText(row.id), row]));
  const currentBySku = new Map(
    (currentRows || [])
      .filter((row) => normalizeText(row.sku))
      .map((row) => [normalizeText(row.sku).toLowerCase(), row]),
  );
  const currentBySlug = new Map(
    (currentRows || [])
      .filter((row) => normalizeText(row.slug))
      .map((row) => [normalizeText(row.slug).toLowerCase(), row]),
  );

  for (const product of source) {
    const payload = buildProductPayload(product, categoryIdMap, brandIdMap);
    const rawId = normalizeText(product?.id);
    const skuKey = normalizeText(product?.sku).toLowerCase();
    const slugKey = normalizeText(product?.slug || payload.slug).toLowerCase();

    const current =
      (isUuid(rawId) && currentById.get(rawId)) ||
      (skuKey && currentBySku.get(skuKey)) ||
      (slugKey && currentBySlug.get(slugKey)) ||
      null;

    let targetId = current?.id || "";

    if (current) {
      const { error: updateError } = await client.from("products").update(payload).eq("id", current.id);

      if (updateError) {
        throw new Error(
          updateError.message || `No pudimos guardar los cambios de ${payload.name}.`,
        );
      }
    } else {
      const { data: inserted, error: insertError } = await client
        .from("products")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        throw new Error(insertError.message || `No pudimos crear el producto ${payload.name}.`);
      }

      targetId = inserted?.id || "";
    }

    if (!targetId) {
      targetId = current?.id || "";
    }

    if (!targetId) {
      throw new Error(`No pudimos identificar el producto ${payload.name} despues de guardarlo.`);
    }

    await syncProductImages(targetId, product);
  }

  const remoteCatalog = await fetchAdminCatalogFromSupabase();
  if (remoteCatalog.length) {
    saveCatalogProducts(remoteCatalog);
  }

  return remoteCatalog;
}

export async function uploadCatalogImages(files, productName = "producto") {
  const client = requireSupabase();
  const safeFiles = Array.isArray(files) ? files.filter(Boolean) : [];

  if (!safeFiles.length) {
    return [];
  }

  const folder = slugify(productName) || "producto";
  const urls = [];

  for (const file of safeFiles) {
    const rawName = normalizeText(file?.name) || "imagen";
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error: uploadError } = await client.storage.from("products").upload(path, file, {
      upsert: false,
      cacheControl: "3600",
    });

    if (uploadError) {
      throw new Error(uploadError.message || "No pudimos subir una de las imagenes.");
    }

    const {
      data: { publicUrl },
    } = client.storage.from("products").getPublicUrl(path);

    urls.push(publicUrl);
  }

  return urls;
}

export function readLocalAdminCatalog() {
  return readCatalogProducts();
}

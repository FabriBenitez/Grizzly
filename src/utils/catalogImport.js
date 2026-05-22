import * as XLSX from "xlsx";
import { CATALOG_IMAGE_PLACEHOLDER } from "./catalogMedia";

const HEADER_ALIASES = {
  sku: ["sku", "codigo", "codigo sku", "codigo interno"],
  name: ["nombre", "producto", "name"],
  category: ["categoria", "category"],
  brand: ["marca", "brand"],
  price: ["precio", "price"],
  transferPrice: ["precio transferencia", "transferencia", "transfer price", "transfer_price"],
  stock: ["stock", "cantidad", "unidades"],
  image: ["imagen principal", "imagen", "image", "url imagen", "image url"],
  description: ["descripcion", "description"],
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const safeValue = normalizeText(value).replace(/\./g, "").replace(",", ".");
  if (!safeValue) {
    return NaN;
  }

  const parsed = Number(safeValue);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeHeader(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveFieldKey(rawKey) {
  const normalized = normalizeHeader(rawKey);

  return (
    Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.includes(normalized))?.[0] || null
  );
}

function buildMappedRow(rawRow) {
  return Object.entries(rawRow || {}).reduce((accumulator, [key, value]) => {
    const fieldKey = resolveFieldKey(key);

    if (fieldKey) {
      accumulator[fieldKey] = value;
    }

    return accumulator;
  }, {});
}

function isRowEmpty(row) {
  return !Object.values(row).some((value) => normalizeText(value));
}

function buildImportedProduct(row, rowNumber) {
  const sku = normalizeText(row.sku);
  const name = normalizeText(row.name);
  const category = normalizeText(row.category);
  const brand = normalizeText(row.brand);
  const description = normalizeText(row.description);
  const image = normalizeText(row.image);
  const price = normalizeNumber(row.price);
  const transferPrice = normalizeNumber(row.transferPrice);
  const stock = normalizeNumber(row.stock);

  return {
    id: `import_${Date.now()}_${rowNumber}`,
    sku,
    slug: `${slugify(name || sku || `producto-${rowNumber}`)}-${rowNumber}`,
    name,
    brand,
    category,
    objective: "General",
    price: Number.isFinite(price) ? price : 0,
    promoPrice: null,
    transferPrice: Number.isFinite(transferPrice) ? transferPrice : Number.isFinite(price) ? price : 0,
    rating: 0,
    reviews: 0,
    stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0,
    sold: 0,
    featured: false,
    promo: false,
    combo: false,
    active: true,
    highlighted: false,
    image: image || CATALOG_IMAGE_PLACEHOLDER,
    gallery: image ? [image] : [],
    description: description || "Producto importado desde archivo masivo.",
  };
}

export function buildCatalogImportRows(rawRows = [], existingProducts = []) {
  const existingSkuSet = new Set(
    existingProducts.map((product) => normalizeText(product.sku).toLowerCase()).filter(Boolean),
  );
  const seenSkuSet = new Set();

  return rawRows
    .map((rawRow) => buildMappedRow(rawRow))
    .filter((row) => !isRowEmpty(row))
    .map((row, index) => {
      const rowNumber = index + 2;
      const sku = normalizeText(row.sku);
      const name = normalizeText(row.name);
      const category = normalizeText(row.category);
      const brand = normalizeText(row.brand);
      const price = normalizeNumber(row.price);
      const stock = normalizeNumber(row.stock);
      const issues = [];

      if (!sku) {
        issues.push("Falta SKU.");
      }

      if (!name) {
        issues.push("Falta nombre.");
      }

      if (!category) {
        issues.push("Falta categoria.");
      }

      if (!brand) {
        issues.push("Falta marca.");
      }

      if (!Number.isFinite(price) || price < 0) {
        issues.push("Precio invalido.");
      }

      if (!Number.isFinite(stock) || stock < 0) {
        issues.push("Stock invalido.");
      }

      const normalizedSku = sku.toLowerCase();

      if (normalizedSku && existingSkuSet.has(normalizedSku)) {
        issues.push("SKU ya existente en el catalogo.");
      }

      if (normalizedSku && seenSkuSet.has(normalizedSku)) {
        issues.push("SKU duplicado dentro del archivo.");
      }

      if (normalizedSku) {
        seenSkuSet.add(normalizedSku);
      }

      const hasDuplicateIssue = issues.some((issue) => issue.includes("SKU"));
      const hasDataIssue = issues.some((issue) => !issue.includes("SKU"));
      const status = hasDataIssue ? "error" : hasDuplicateIssue ? "duplicate" : "ready";

      return {
        rowNumber,
        sku,
        name,
        category,
        brand,
        price: Number.isFinite(price) ? price : "",
        transferPrice:
          Number.isFinite(normalizeNumber(row.transferPrice)) ? normalizeNumber(row.transferPrice) : "",
        stock: Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : "",
        image: normalizeText(row.image),
        description: normalizeText(row.description),
        status,
        issues,
        product: status === "ready" ? buildImportedProduct(row, rowNumber) : null,
      };
    });
}

export function buildCatalogImportSummary(rows = []) {
  return rows.reduce(
    (accumulator, row) => {
      accumulator.total += 1;

      if (row.status === "ready") {
        accumulator.ready += 1;
      } else if (row.status === "duplicate") {
        accumulator.duplicates += 1;
      } else {
        accumulator.errors += 1;
      }

      return accumulator;
    },
    {
      total: 0,
      ready: 0,
      duplicates: 0,
      errors: 0,
    },
  );
}

export async function parseCatalogImportFile(file, existingProducts = []) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
  });
  const firstSheetName = workbook.SheetNames?.[0];

  if (!firstSheetName) {
    throw new Error("El archivo no contiene hojas para importar.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  if (!rawRows.length) {
    throw new Error("El archivo esta vacio o no tiene filas con datos.");
  }

  const rows = buildCatalogImportRows(rawRows, existingProducts);
  const summary = buildCatalogImportSummary(rows);

  return {
    rows,
    summary,
  };
}

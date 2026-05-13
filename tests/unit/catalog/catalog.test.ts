import { describe, expect, it } from "vitest";

import { filterProducts, getEffectivePrice, sortProducts } from "../../../src/utils/catalog";
import {
  createCatalogSeed,
  getCatalogBrands,
  getCatalogCategories,
} from "../../../src/utils/catalogStore";
import {
  getComboProducts,
  getHighlightedProducts,
  getMostSoldProducts,
  getPromoProducts,
  getRelatedProducts,
  getStockState,
} from "../../../src/shared/catalog/productDiscovery";

const sampleProducts = [
  {
    id: "1",
    slug: "creatina-star",
    name: "Creatina Star 300g",
    category: "Creatina",
    brand: "Star Nutrition",
    price: 20,
    promoPrice: 15,
    transferPrice: 14,
    promo: true,
    combo: false,
    highlighted: true,
    stock: 25,
    sold: 100,
  },
  {
    id: "2",
    slug: "whey-ena",
    name: "Whey ENA 2lb",
    category: "Proteina",
    brand: "ENA",
    price: 18,
    promoPrice: null,
    transferPrice: 17,
    promo: false,
    combo: false,
    highlighted: false,
    stock: 12,
    sold: 40,
  },
  {
    id: "3",
    slug: "combo-volumen",
    name: "Combo Volumen",
    category: "Combos",
    brand: "Grizzly Labs",
    price: 19,
    promoPrice: 16,
    transferPrice: 15,
    promo: true,
    combo: true,
    highlighted: true,
    stock: 4,
    sold: 75,
  },
  {
    id: "4",
    slug: "creatina-x3",
    name: "Creatina X3",
    category: "Creatina",
    brand: "Star Nutrition",
    price: 17,
    promoPrice: null,
    transferPrice: 16,
    promo: false,
    combo: false,
    highlighted: false,
    stock: 9,
    sold: 55,
  },
];

describe("catalogo y descubrimiento de productos", () => {
  it("lista productos desde el seed y genera categorias unicas", () => {
    const seed = createCatalogSeed();

    expect(seed.length).toBeGreaterThan(0);
    expect(seed.every((product) => Boolean(product.slug))).toBe(true);
    expect(getCatalogCategories(sampleProducts)).toEqual(["Creatina", "Proteina", "Combos"]);
    expect(getCatalogBrands(sampleProducts)).toEqual([
      "Star Nutrition",
      "ENA",
      "Grizzly Labs",
    ]);
  });

  it("busca por nombre, categoria y marca", () => {
    expect(filterProducts(sampleProducts, { query: "x3" }).map((product) => product.id)).toEqual(["4"]);
    expect(filterProducts(sampleProducts, { query: "proteina" }).map((product) => product.id)).toEqual(["2"]);
    expect(filterProducts(sampleProducts, { query: "grizzly labs" }).map((product) => product.id)).toEqual(["3"]);
  });

  it("aplica filtros por categoria, marca, precio y promo", () => {
    const filtered = filterProducts(sampleProducts, {
      category: "Creatina",
      brand: "Star Nutrition",
      minPrice: "14",
      maxPrice: "16",
      promoOnly: true,
    });

    expect(filtered.map((product) => product.id)).toEqual(["1"]);
  });

  it("ordena el listado por precio y ventas", () => {
    expect(sortProducts(sampleProducts, "priceAsc").map((product) => product.id)).toEqual([
      "1",
      "3",
      "4",
      "2",
    ]);
    expect(sortProducts(sampleProducts, "priceDesc").map((product) => product.id)).toEqual([
      "2",
      "4",
      "3",
      "1",
    ]);
    expect(sortProducts(sampleProducts, "mostSold").map((product) => product.id)).toEqual([
      "1",
      "3",
      "4",
      "2",
    ]);
    expect(getEffectivePrice(sampleProducts[0])).toBe(15);
  });

  it("selecciona productos destacados para promos, combos, destacados y mas vendidos", () => {
    expect(getPromoProducts(sampleProducts, 6).map((product) => product.id)).toEqual(["1", "3"]);
    expect(getComboProducts(sampleProducts, 6).map((product) => product.id)).toEqual(["3"]);
    expect(getHighlightedProducts(sampleProducts, 6).map((product) => product.id)).toEqual(["1", "3"]);
    expect(getMostSoldProducts(sampleProducts, 2).map((product) => product.id)).toEqual(["1", "3"]);
  });

  it("expone el stock visible con el tono correcto", () => {
    expect(getStockState(30)).toEqual({ label: "Stock disponible", tone: "ok" });
    expect(getStockState(12)).toEqual({ label: "Ultimas unidades", tone: "warn" });
    expect(getStockState(5)).toEqual({ label: "Stock bajo", tone: "alert" });
  });

  it("sugiere productos relacionados de la misma categoria sin repetir el actual", () => {
    const related = getRelatedProducts(sampleProducts, sampleProducts[0], 4);

    expect(related.map((product) => product.id)).toEqual(["4"]);
    expect(getRelatedProducts(sampleProducts, null, 4)).toEqual([]);
  });
});

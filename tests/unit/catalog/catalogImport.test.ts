import { describe, expect, it } from "vitest";

import {
  buildCatalogImportRows,
  buildCatalogImportSummary,
} from "../../../src/utils/catalogImport";

describe("utils/catalogImport", () => {
  it("mapea columnas de archivo y marca filas nuevas listas para importar", () => {
    const rows = buildCatalogImportRows([
      {
        SKU: "CREA-300-ST",
        Nombre: "Creatina Monohidrato 300g",
        Categoria: "Creatina",
        Marca: "Star Nutrition",
        Precio: "41900",
        "Precio transferencia": "39900",
        Stock: "12",
        "Imagen principal": "https://cdn.test/creatina.jpg",
        Descripcion: "Creatina micronizada.",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ready");
    expect(rows[0].product).toMatchObject({
      sku: "CREA-300-ST",
      name: "Creatina Monohidrato 300g",
      category: "Creatina",
      brand: "Star Nutrition",
      price: 41900,
      transferPrice: 39900,
      stock: 12,
      gallery: ["https://cdn.test/creatina.jpg"],
    });
  });

  it("detecta duplicados contra el catalogo actual y dentro del mismo archivo", () => {
    const rows = buildCatalogImportRows(
      [
        {
          SKU: "EXISTENTE-1",
          Nombre: "Producto A",
          Categoria: "Creatina",
          Marca: "Star",
          Precio: "100",
          Stock: "2",
        },
        {
          SKU: "NUEVO-1",
          Nombre: "Producto B",
          Categoria: "Proteina",
          Marca: "ENA",
          Precio: "200",
          Stock: "3",
        },
        {
          SKU: "NUEVO-1",
          Nombre: "Producto C",
          Categoria: "Proteina",
          Marca: "ENA",
          Precio: "200",
          Stock: "3",
        },
      ],
      [{ sku: "EXISTENTE-1" }],
    );

    expect(rows[0].status).toBe("duplicate");
    expect(rows[0].issues.join(" ")).toContain("existente");
    expect(rows[1].status).toBe("ready");
    expect(rows[2].status).toBe("duplicate");
    expect(rows[2].issues.join(" ")).toContain("archivo");
  });

  it("marca errores cuando faltan campos requeridos o numeros validos", () => {
    const rows = buildCatalogImportRows([
      {
        SKU: "",
        Nombre: "",
        Categoria: "Creatina",
        Marca: "Star",
        Precio: "abc",
        Stock: "-3",
      },
    ]);

    expect(rows[0].status).toBe("error");
    expect(rows[0].issues).toContain("Falta SKU.");
    expect(rows[0].issues).toContain("Falta nombre.");
    expect(rows[0].issues).toContain("Precio invalido.");
    expect(rows[0].issues).toContain("Stock invalido.");
  });

  it("resume correctamente filas listas, duplicadas y con error", () => {
    const summary = buildCatalogImportSummary([
      { status: "ready" },
      { status: "ready" },
      { status: "duplicate" },
      { status: "error" },
    ]);

    expect(summary).toEqual({
      total: 4,
      ready: 2,
      duplicates: 1,
      errors: 1,
    });
  });
});

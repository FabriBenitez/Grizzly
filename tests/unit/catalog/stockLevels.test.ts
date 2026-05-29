import { describe, expect, it } from "vitest";

import {
  DEFAULT_STOCK_THRESHOLD,
  getCriticalStockThreshold,
  getPublicStockState,
  getStockLevel,
  getStockPercent,
} from "../../../src/shared/catalog/stockLevels";

describe("shared/catalog/stockLevels", () => {
  describe("getStockLevel", () => {
    it("devuelve 'critico' cuando el stock es menor o igual a la mitad del umbral", () => {
      expect(getStockLevel(0, 10)).toBe("critico");
      expect(getStockLevel(1, 10)).toBe("critico");
      expect(getStockLevel(5, 10)).toBe("critico");
    });

    it("devuelve 'bajo' cuando el stock esta entre la mitad y el umbral", () => {
      expect(getStockLevel(6, 10)).toBe("bajo");
      expect(getStockLevel(9, 10)).toBe("bajo");
      expect(getStockLevel(10, 10)).toBe("bajo");
    });

    it("devuelve 'ok' cuando el stock supera el umbral", () => {
      expect(getStockLevel(11, 10)).toBe("ok");
      expect(getStockLevel(100, 10)).toBe("ok");
    });

    it("maneja umbrales impares correctamente (floor de la mitad)", () => {
      // threshold = 7 → critical = floor(7/2) = 3
      expect(getStockLevel(3, 7)).toBe("critico");
      expect(getStockLevel(4, 7)).toBe("bajo");
      expect(getStockLevel(7, 7)).toBe("bajo");
      expect(getStockLevel(8, 7)).toBe("ok");
    });

    it("protege contra umbrales minimos (threshold 1)", () => {
      // threshold = 1 → critical = max(1, floor(1/2)) = max(1, 0) = 1
      expect(getStockLevel(0, 1)).toBe("critico");
      expect(getStockLevel(1, 1)).toBe("critico");
      expect(getStockLevel(2, 1)).toBe("ok");
    });
  });

  describe("getStockPercent", () => {
    it("calcula el porcentaje relativo al doble del umbral", () => {
      expect(getStockPercent(10, 10)).toBe(50);
      expect(getStockPercent(20, 10)).toBe(100);
    });

    it("clampea al minimo 6% y maximo 100%", () => {
      expect(getStockPercent(0, 10)).toBe(6);
      expect(getStockPercent(100, 10)).toBe(100);
    });

    it("protege contra division por cero en umbral 0", () => {
      // safeCap = max(0*2, 1) = 1
      const result = getStockPercent(0, 0);
      expect(result).toBeGreaterThanOrEqual(6);
    });
  });

  describe("getCriticalStockThreshold", () => {
    it("devuelve la mitad redondeada hacia abajo con minimo de 1", () => {
      expect(getCriticalStockThreshold(10)).toBe(5);
      expect(getCriticalStockThreshold(7)).toBe(3);
      expect(getCriticalStockThreshold(1)).toBe(1);
      expect(getCriticalStockThreshold(2)).toBe(1);
    });

    it("usa DEFAULT_STOCK_THRESHOLD si no se pasa parametro", () => {
      expect(getCriticalStockThreshold()).toBe(Math.max(1, Math.floor(DEFAULT_STOCK_THRESHOLD / 2)));
    });
  });

  describe("getPublicStockState", () => {
    it("devuelve 'Sin stock' cuando stock es 0 o negativo", () => {
      expect(getPublicStockState(0)).toEqual({ label: "Sin stock", tone: "alert" });
      expect(getPublicStockState(-5)).toEqual({ label: "Sin stock", tone: "alert" });
    });

    it("devuelve 'Ultimas unidades' cuando esta en rango critico", () => {
      // threshold default = 12 → critical = 6
      expect(getPublicStockState(1)).toEqual({ label: "Ultimas unidades", tone: "alert" });
      expect(getPublicStockState(6)).toEqual({ label: "Ultimas unidades", tone: "alert" });
    });

    it("devuelve 'Stock bajo' cuando esta entre critico y umbral", () => {
      expect(getPublicStockState(7)).toEqual({ label: "Stock bajo", tone: "warn" });
      expect(getPublicStockState(12)).toEqual({ label: "Stock bajo", tone: "warn" });
    });

    it("devuelve 'Stock disponible' cuando supera el umbral", () => {
      expect(getPublicStockState(13)).toEqual({ label: "Stock disponible", tone: "ok" });
      expect(getPublicStockState(100)).toEqual({ label: "Stock disponible", tone: "ok" });
    });

    it("acepta un umbral personalizado", () => {
      // threshold = 4 → critical = floor(4/2) = 2
      expect(getPublicStockState(2, 4)).toEqual({ label: "Ultimas unidades", tone: "alert" });
      expect(getPublicStockState(3, 4)).toEqual({ label: "Stock bajo", tone: "warn" });
      // threshold = 6 → critical = floor(6/2) = 3
      expect(getPublicStockState(3, 6)).toEqual({ label: "Ultimas unidades", tone: "alert" });
      expect(getPublicStockState(4, 6)).toEqual({ label: "Stock bajo", tone: "warn" });
      expect(getPublicStockState(7, 6)).toEqual({ label: "Stock disponible", tone: "ok" });
    });
  });
});

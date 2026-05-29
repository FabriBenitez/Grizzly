/**
 * Pure stock-level logic — no localStorage, no side effects.
 * Consumed by both admin stock page and public product discovery.
 */

export const DEFAULT_STOCK_THRESHOLD = 12;

export function getStockLevel(stock: number, threshold: number): "critico" | "bajo" | "ok" {
  if (stock <= Math.max(1, Math.floor(threshold / 2))) {
    return "critico";
  }

  if (stock <= threshold) {
    return "bajo";
  }

  return "ok";
}

export function getStockPercent(stock: number, threshold: number): number {
  const safeCap = Math.max(threshold * 2, 1);
  return Math.min(100, Math.max(6, Math.round((stock / safeCap) * 100)));
}

export function getCriticalStockThreshold(threshold: number = DEFAULT_STOCK_THRESHOLD): number {
  return Math.max(1, Math.floor(threshold / 2));
}

export function getPublicStockState(
  stock: number = 0,
  threshold: number = DEFAULT_STOCK_THRESHOLD,
): { label: string; tone: string } {
  if (stock <= 0) {
    return {
      label: "Sin stock",
      tone: "alert",
    };
  }

  if (stock <= getCriticalStockThreshold(threshold)) {
    return {
      label: "Ultimas unidades",
      tone: "alert",
    };
  }

  if (stock <= threshold) {
    return {
      label: "Stock bajo",
      tone: "warn",
    };
  }

  return {
    label: "Stock disponible",
    tone: "ok",
  };
}

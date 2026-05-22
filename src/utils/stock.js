export const STOCK_THRESHOLD_KEY = "grizzly_low_stock_threshold";
export const DEFAULT_STOCK_THRESHOLD = 12;

export function readStockThreshold() {
  if (typeof window === "undefined") {
    return DEFAULT_STOCK_THRESHOLD;
  }

  try {
    const raw = window.localStorage.getItem(STOCK_THRESHOLD_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STOCK_THRESHOLD;
  } catch {
    return DEFAULT_STOCK_THRESHOLD;
  }
}

export function writeStockThreshold(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STOCK_THRESHOLD_KEY, String(value));
}

export function getStockLevel(stock, threshold) {
  if (stock <= Math.max(1, Math.floor(threshold / 2))) {
    return "critico";
  }

  if (stock <= threshold) {
    return "bajo";
  }

  return "ok";
}

export function getStockPercent(stock, threshold) {
  const safeCap = Math.max(threshold * 2, 1);
  return Math.min(100, Math.max(6, Math.round((stock / safeCap) * 100)));
}

export function getCriticalStockThreshold(threshold = readStockThreshold()) {
  return Math.max(1, Math.floor(threshold / 2));
}

export function getPublicStockState(stock = 0, threshold = readStockThreshold()) {
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

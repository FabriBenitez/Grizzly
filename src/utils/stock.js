export const STOCK_THRESHOLD_KEY = "grizzly_low_stock_threshold";

export function readStockThreshold() {
  if (typeof window === "undefined") {
    return 12;
  }

  try {
    const raw = window.localStorage.getItem(STOCK_THRESHOLD_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
  } catch {
    return 12;
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

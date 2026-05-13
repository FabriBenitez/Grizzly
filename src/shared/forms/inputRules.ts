function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trimStart();
}

export function sanitizeLettersOnly(value: string) {
  return normalizeSpaces(String(value || "").replace(/[^\p{L}\s'-]/gu, ""));
}

export function sanitizeNumbersOnly(value: string) {
  return String(value || "").replace(/\D+/g, "");
}

export function sanitizePhoneNumber(value: string) {
  return sanitizeNumbersOnly(value).slice(0, 15);
}

export function sanitizePostalCode(value: string) {
  return sanitizeNumbersOnly(value).slice(0, 8);
}

export function sanitizeDni(value: string) {
  return sanitizeNumbersOnly(value).slice(0, 8);
}

export function sanitizeOrderNumber(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .trim();
}

export function hasLettersOnly(value: string) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 && /^[\p{L}\s'-]+$/u.test(normalized);
}

export function hasNumbersOnly(value: string) {
  const normalized = String(value || "").trim();
  return normalized.length > 0 && /^\d+$/.test(normalized);
}

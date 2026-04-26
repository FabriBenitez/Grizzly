function cleanPhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

export function normalizeWhatsAppPhone(phone) {
  const digits = cleanPhone(phone);
  if (!digits) {
    return "";
  }

  if (digits.startsWith("549")) {
    return digits;
  }

  if (digits.startsWith("54")) {
    return `549${digits.slice(2)}`;
  }

  if (digits.length >= 10) {
    return `549${digits}`;
  }

  return digits;
}

export function buildWhatsAppLink(phone, message = "") {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) {
    return "";
  }

  const baseUrl = `https://wa.me/${normalizedPhone}`;
  return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
}

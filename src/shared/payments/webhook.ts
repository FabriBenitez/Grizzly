function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const PAYMENT_STATUS_MAP = {
  approved: "approved",
  authorized: "pending",
  in_process: "pending",
  pending: "pending",
  rejected: "rejected",
  cancelled: "rejected",
  refunded: "refunded",
  charged_back: "rejected",
} as const;

export function parseSignatureHeader(signatureHeader: string | null) {
  if (!signatureHeader) {
    return { ts: "", v1: "" };
  }

  return signatureHeader.split(",").reduce(
    (acc, part) => {
      const [key, rawValue] = part.split("=");
      const value = normalizeText(rawValue);

      if (normalizeText(key) === "ts") {
        acc.ts = value;
      }

      if (normalizeText(key) === "v1") {
        acc.v1 = value;
      }

      return acc;
    },
    { ts: "", v1: "" },
  );
}

export function resolveInternalPaymentStatus(mercadoPagoStatus: string) {
  return PAYMENT_STATUS_MAP[mercadoPagoStatus as keyof typeof PAYMENT_STATUS_MAP] || "pending";
}

export function resolveOrderStatus(currentOrderStatus: string, internalPaymentStatus: string) {
  if (internalPaymentStatus === "approved") {
    return currentOrderStatus === "cancelled" ? "cancelled" : "paid";
  }

  return currentOrderStatus || "pending";
}

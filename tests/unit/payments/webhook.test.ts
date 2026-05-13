import { describe, expect, it } from "vitest";

import {
  parseSignatureHeader,
  resolveInternalPaymentStatus,
  resolveOrderStatus,
} from "../../../src/shared/payments/webhook";

describe("shared/payments/webhook", () => {
  it("parsea correctamente la cabecera x-signature", () => {
    expect(parseSignatureHeader("ts=1715442000,v1=abc123")).toEqual({
      ts: "1715442000",
      v1: "abc123",
    });

    expect(parseSignatureHeader(null)).toEqual({
      ts: "",
      v1: "",
    });
  });

  it("mapea los estados de Mercado Pago al estado interno", () => {
    expect(resolveInternalPaymentStatus("approved")).toBe("approved");
    expect(resolveInternalPaymentStatus("authorized")).toBe("pending");
    expect(resolveInternalPaymentStatus("rejected")).toBe("rejected");
    expect(resolveInternalPaymentStatus("refunded")).toBe("refunded");
    expect(resolveInternalPaymentStatus("estado-raro")).toBe("pending");
  });

  it("resuelve el estado final del pedido segun el pago", () => {
    expect(resolveOrderStatus("pending", "approved")).toBe("paid");
    expect(resolveOrderStatus("cancelled", "approved")).toBe("cancelled");
    expect(resolveOrderStatus("packing", "pending")).toBe("packing");
    expect(resolveOrderStatus("", "pending")).toBe("pending");
  });
});

import { describe, expect, it } from "vitest";

import {
  CONFIRMED_ORDER_STATUSES,
  getAdminMetrics,
  getPaymentStageOrders,
  getStatusDistribution,
  getTopProductsFromOrders,
} from "../../../src/utils/admin";

function buildOrder(overrides = {}) {
  return {
    number: "000001",
    status: "Pendiente de pago",
    customer: { name: "Test", phone: "123" },
    createdAt: "2026-01-01T00:00:00.000Z",
    totals: { subtotal: 100, discount: 0, shipping: 10, total: 110 },
    items: [],
    ...overrides,
  };
}

describe("utils/admin (sin dependencias locales)", () => {
  describe("CONFIRMED_ORDER_STATUSES", () => {
    it("incluye los estados con pago confirmado y entrega", () => {
      expect(CONFIRMED_ORDER_STATUSES).toContain("Pago confirmado");
      expect(CONFIRMED_ORDER_STATUSES).toContain("En preparacion");
      expect(CONFIRMED_ORDER_STATUSES).toContain("Despachado");
      expect(CONFIRMED_ORDER_STATUSES).toContain("Entregado");
      expect(CONFIRMED_ORDER_STATUSES).not.toContain("Pendiente de pago");
      expect(CONFIRMED_ORDER_STATUSES).not.toContain("Cancelado");
    });
  });

  describe("getAdminMetrics", () => {
    it("calcula metricas correctas para un conjunto de ordenes", () => {
      const orders = [
        buildOrder({ status: "Pendiente de pago" }),
        buildOrder({ status: "Pendiente de pago" }),
        buildOrder({ status: "Pago confirmado", totals: { total: 200 } }),
        buildOrder({ status: "En preparacion", totals: { total: 150 } }),
        buildOrder({ status: "Despachado", totals: { total: 80 } }),
        buildOrder({ status: "Entregado", totals: { total: 300 } }),
        buildOrder({ status: "Cancelado" }),
        buildOrder({ status: "Vencido" }),
      ];

      const metrics = getAdminMetrics(orders);

      expect(metrics.totalOrders).toBe(8);
      expect(metrics.pendingPayment).toBe(2);
      expect(metrics.confirmedPayment).toBe(1);
      expect(metrics.inPreparation).toBe(1);
      expect(metrics.dispatched).toBe(1);
      expect(metrics.delivered).toBe(1);
      expect(metrics.cancelled).toBe(2);
      expect(metrics.confirmedRevenue).toBe(730);
    });

    it("devuelve ceros cuando no hay ordenes", () => {
      const metrics = getAdminMetrics([]);

      expect(metrics.totalOrders).toBe(0);
      expect(metrics.confirmedRevenue).toBe(0);
    });
  });

  describe("getPaymentStageOrders", () => {
    it("filtra solo ordenes en etapas de pago", () => {
      const orders = [
        buildOrder({ number: "001", status: "Pendiente de pago" }),
        buildOrder({ number: "002", status: "Pago confirmado" }),
        buildOrder({ number: "003", status: "En preparacion" }),
        buildOrder({ number: "004", status: "Despachado" }),
        buildOrder({ number: "005", status: "Cancelado" }),
        buildOrder({ number: "006", status: "Vencido" }),
        buildOrder({ number: "007", status: "Entregado" }),
      ];

      const result = getPaymentStageOrders(orders);
      const resultNumbers = result.map((o) => o.number);

      expect(result.length).toBe(4);
      expect(resultNumbers).toContain("001");
      expect(resultNumbers).toContain("002");
      expect(resultNumbers).toContain("005");
      expect(resultNumbers).toContain("006");
      expect(resultNumbers).not.toContain("003");
      expect(resultNumbers).not.toContain("004");
      expect(resultNumbers).not.toContain("007");
    });
  });

  describe("getStatusDistribution", () => {
    it("cuenta la distribucion de estados correctamente", () => {
      const orders = [
        buildOrder({ status: "Pendiente de pago" }),
        buildOrder({ status: "Pendiente de pago" }),
        buildOrder({ status: "Entregado" }),
      ];

      const dist = getStatusDistribution(orders);
      const pending = dist.find((d) => d.status === "Pendiente de pago");
      const delivered = dist.find((d) => d.status === "Entregado");

      expect(pending?.count).toBe(2);
      expect(delivered?.count).toBe(1);
    });
  });

  describe("getTopProductsFromOrders", () => {
    it("agrega productos vendidos de ordenes confirmadas", () => {
      const orders = [
        buildOrder({
          status: "Entregado",
          items: [
            { id: "p1", name: "Creatina", quantity: 3, subtotal: 60 },
            { id: "p2", name: "Whey", quantity: 1, subtotal: 40 },
          ],
        }),
        buildOrder({
          status: "Pago confirmado",
          items: [
            { id: "p1", name: "Creatina", quantity: 2, subtotal: 40 },
          ],
        }),
        buildOrder({
          status: "Pendiente de pago",
          items: [
            { id: "p3", name: "BCAA", quantity: 10, subtotal: 200 },
          ],
        }),
      ];

      const top = getTopProductsFromOrders(orders, 5);

      expect(top[0].id).toBe("p1");
      expect(top[0].quantity).toBe(5);
      expect(top[0].revenue).toBe(100);
      expect(top[1].id).toBe("p2");
      expect(top.find((p) => p.id === "p3")).toBeUndefined();
    });

    it("respeta el limite de resultados", () => {
      const orders = [
        buildOrder({
          status: "Entregado",
          items: [
            { id: "p1", name: "A", quantity: 5, subtotal: 50 },
            { id: "p2", name: "B", quantity: 4, subtotal: 40 },
            { id: "p3", name: "C", quantity: 3, subtotal: 30 },
          ],
        }),
      ];

      const top = getTopProductsFromOrders(orders, 2);
      expect(top.length).toBe(2);
    });
  });
});

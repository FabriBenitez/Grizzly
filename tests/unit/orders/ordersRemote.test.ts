import { describe, expect, it } from "vitest";

import { normalizeRemoteOrder } from "../../../src/utils/orders.remote";

function buildDbOrderRow(overrides = {}) {
  return {
    id: "order-uuid-1",
    order_number: "GRZ-ABC12345",
    customer_name: "Juan Perez",
    customer_email: "juan@test.com",
    customer_phone: "1155551234",
    shipping_type: "delivery",
    shipping_address_json: {
      type: "envio",
      address: "Av Corrientes 1234",
      locality: "CABA",
      postalCode: "1041",
    },
    notes: "Timbre 3B",
    subtotal: 5000,
    discount: 500,
    shipping_cost: 800,
    total: 5300,
    status: "pending",
    payment_status: "pending",
    created_at: "2026-05-20T10:00:00.000Z",
    updated_at: "2026-05-20T10:00:00.000Z",
    order_items: [
      {
        id: "item-1",
        product_id: "prod-1",
        product_name: "Creatina Star 300g",
        unit_price: 2500,
        promo_price: null,
        quantity: 2,
        line_total: 5000,
      },
    ],
    payments: [
      {
        id: "pay-1",
        provider: "mercadopago",
        preference_id: "pref-123",
        payment_id: null,
        external_reference: "GRZ-ABC12345",
        amount: 5300,
        status: "pending",
        payment_method: "mercadopago",
        approved_at: null,
        rejected_at: null,
        updated_at: "2026-05-20T10:00:00.000Z",
      },
    ],
    order_status_history: [
      {
        previous_status: null,
        new_status: "pending",
        changed_at: "2026-05-20T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("orders.remote — normalizeRemoteOrder", () => {
  it("transforma una fila de DB en formato de UI con todos los campos", () => {
    const row = buildDbOrderRow();
    const result = normalizeRemoteOrder(row);

    expect(result.id).toBe("order-uuid-1");
    expect(result.number).toBe("GRZ-ABC12345");
    expect(result.status).toBe("Pendiente de pago");
    expect(result.customer.name).toBe("Juan Perez");
    expect(result.customer.email).toBe("juan@test.com");
    expect(result.customer.phone).toBe("1155551234");
    expect(result.delivery.type).toBe("envio");
    expect(result.delivery.address).toBe("Av Corrientes 1234");
    expect(result.delivery.locality).toBe("CABA");
    expect(result.delivery.postalCode).toBe("1041");
    expect(result.totals.subtotal).toBe(5000);
    expect(result.totals.discount).toBe(500);
    expect(result.totals.shipping).toBe(800);
    expect(result.totals.total).toBe(5300);
    expect(result.items.length).toBe(1);
    expect(result.items[0].name).toBe("Creatina Star 300g");
    expect(result.items[0].quantity).toBe(2);
    expect(result.paymentMethod).toBe("Mercado Pago");
    expect(result.observation).toBe("Timbre 3B");
    expect(result.canCancel).toBe(false);
    expect(result._db.id).toBe("order-uuid-1");
    expect(result._db.status).toBe("pending");
  });

  it("mapea todos los estados de DB a estados de UI correctamente", () => {
    const statusMap = {
      pending: "Pendiente de pago",
      paid: "Pago confirmado",
      packing: "En preparacion",
      shipped: "Despachado",
      delivered: "Entregado",
      cancelled: "Cancelado",
    };

    for (const [dbStatus, uiStatus] of Object.entries(statusMap)) {
      const result = normalizeRemoteOrder(buildDbOrderRow({ status: dbStatus }));
      expect(result.status).toBe(uiStatus);
    }
  });

  it("mapea metodo de pago transferencia correctamente", () => {
    const row = buildDbOrderRow({
      payments: [
        {
          id: "pay-2",
          provider: "manual",
          status: "pending",
          payment_method: "transferencia",
          amount: 5300,
        },
      ],
    });

    const result = normalizeRemoteOrder(row);
    expect(result.paymentMethod).toBe("Transferencia");
  });

  it("maneja orden con pickup correctamente", () => {
    const row = buildDbOrderRow({
      shipping_type: "pickup",
      shipping_address_json: {},
    });

    const result = normalizeRemoteOrder(row);
    expect(result.delivery.type).toBe("retiro");
  });

  it("maneja ordenes sin items ni payments de forma segura", () => {
    const row = buildDbOrderRow({
      order_items: null,
      payments: null,
      order_status_history: null,
    });

    const result = normalizeRemoteOrder(row);

    expect(result.items).toEqual([]);
    expect(result.paymentMethod).toBe("Sin definir");
    expect(result.statusHistory.length).toBeGreaterThan(0);
  });

  it("construye el historial de estados desde la base de datos", () => {
    const row = buildDbOrderRow({
      status: "paid",
      payment_status: "approved",
      order_status_history: [
        { previous_status: null, new_status: "pending", changed_at: "2026-05-20T10:00:00.000Z" },
        { previous_status: "pending", new_status: "paid", changed_at: "2026-05-20T11:00:00.000Z" },
      ],
    });

    const result = normalizeRemoteOrder(row);

    expect(result.statusHistory.length).toBe(2);
    expect(result.statusHistory[0].status).toBe("Pendiente de pago");
    expect(result.statusHistory[1].status).toBe("Pago confirmado");
  });

  it("agrega una entrada al historial si el estado actual no esta representado", () => {
    const row = buildDbOrderRow({
      status: "packing",
      payment_status: "approved",
      order_status_history: [
        { previous_status: null, new_status: "pending", changed_at: "2026-05-20T10:00:00.000Z" },
      ],
    });

    const result = normalizeRemoteOrder(row);
    const lastEntry = result.statusHistory[result.statusHistory.length - 1];

    expect(lastEntry.status).toBe("En preparacion");
  });

  it("normaliza numeros con precision de 2 decimales", () => {
    const row = buildDbOrderRow({
      subtotal: 99.999,
      shipping_cost: 10.001,
      total: 110.0005,
    });

    const result = normalizeRemoteOrder(row);

    expect(result.totals.subtotal).toBe(100);
    expect(result.totals.shipping).toBe(10);
    expect(result.totals.total).toBe(110);
  });
});

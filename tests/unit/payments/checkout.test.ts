import { describe, expect, it } from "vitest";

import {
  PAYMENT_METHODS,
  buildMercadoPagoItems,
  buildMercadoPagoShipments,
  buildOrderItems,
  normalizeExistingOrder,
  resolvePublicAppUrl,
  validateNewCheckoutPayload,
} from "../../../src/shared/payments/checkout";

function buildValidCheckoutPayload() {
  return {
    paymentMethod: PAYMENT_METHODS.mercadoPago,
    customer: {
      name: "Fabri Benitez",
      phone: "1122334455",
      email: "FABRI@EXAMPLE.COM",
    },
    items: [
      {
        id: "e6decc10-cbfb-4b74-b0a5-8ebf4f4e2505",
        name: "Creatina",
        quantity: 2,
        basePrice: 20,
        effectivePrice: 15,
      },
    ],
    totals: {
      subtotal: 30,
      discount: 10,
      shipping: 5,
      total: 35,
    },
    delivery: {
      type: "correo",
      address: "Calle 123",
      locality: "Moreno",
      postalCode: "1744",
    },
    observation: "Tocar timbre",
  };
}

describe("shared/payments/checkout", () => {
  it("acepta una app URL publica en https y descarta localhost", () => {
    expect(
      resolvePublicAppUrl({
        appUrl: "http://localhost:5173",
        requestOrigin: "https://grizzly.com/",
      }),
    ).toBe("https://grizzly.com");

    expect(
      resolvePublicAppUrl({
        appUrl: "http://localhost:5173",
        requestOrigin: "http://127.0.0.1:3000",
      }),
    ).toBe("");
  });

  it("valida y normaliza el payload del checkout", () => {
    const result = validateNewCheckoutPayload(buildValidCheckoutPayload());

    expect(result.errors).toEqual([]);
    expect(result.customerEmail).toBe("fabri@example.com");
    expect(result.paymentMethod).toBe("mercadopago");
    expect(result.items).toEqual([
      {
        product_id: "e6decc10-cbfb-4b74-b0a5-8ebf4f4e2505",
        product_name: "Creatina",
        unit_price: 20,
        promo_price: 15,
        quantity: 2,
        line_total: 30,
      },
    ]);
  });

  it("detecta errores criticos de checkout antes de crear la orden", () => {
    const result = validateNewCheckoutPayload({
      paymentMethod: "cripto",
      customer: {
        name: "",
        phone: "",
        email: "correo-invalido",
      },
      items: [],
      totals: {
        subtotal: 0,
        total: 0,
      },
      delivery: {},
    });

    expect(result.errors).toContain("Falta el nombre del cliente.");
    expect(result.errors).toContain("Falta el telefono del cliente.");
    expect(result.errors).toContain("El email del cliente es obligatorio para continuar.");
    expect(result.errors).toContain("No hay productos para generar la orden.");
    expect(result.errors).toContain("La forma de pago seleccionada no es valida.");
    expect(result.errors).toContain("Faltan datos de envio.");
    expect(result.errors).toContain("Los totales del pedido no son validos.");
  });

  it("rechaza mezcla invalida de letras y numeros en campos controlados", () => {
    const result = validateNewCheckoutPayload({
      paymentMethod: PAYMENT_METHODS.mercadoPago,
      customer: {
        name: "Juan123",
        phone: "11AB2233",
        email: "juan@example.com",
      },
      items: [
        {
          id: "e6decc10-cbfb-4b74-b0a5-8ebf4f4e2505",
          name: "Creatina",
          quantity: 1,
          basePrice: 15,
          effectivePrice: 15,
        },
      ],
      totals: {
        subtotal: 15,
        shipping: 5,
        total: 20,
      },
      delivery: {
        type: "correo",
        address: "Calle 123",
        locality: "Moreno9",
        postalCode: "17A44",
      },
    });

    expect(result.errors).toContain("El nombre del cliente solo puede contener letras.");
    expect(result.errors).toContain("El telefono del cliente solo puede contener numeros.");
    expect(result.errors).toContain("La localidad solo puede contener letras.");
    expect(result.errors).toContain("El codigo postal solo puede contener numeros.");
  });

  it("arma order_items listos para guardar y respeta promos", () => {
    const items = buildOrderItems([
      {
        id: "no-es-uuid",
        name: "Whey",
        quantity: 3.8,
        basePrice: 19,
        effectivePrice: 12.5,
      },
    ]);

    expect(items).toEqual([
      {
        product_id: null,
        product_name: "Whey",
        unit_price: 19,
        promo_price: 12.5,
        quantity: 3,
        line_total: 37.5,
      },
    ]);
  });

  it("convierte una orden guardada en datos listos para Mercado Pago", () => {
    const order = normalizeExistingOrder({
      id: "ord_1",
      order_number: "GRZ-0001",
      customer_name: "Fabri Benitez",
      customer_phone: "1122334455",
      customer_email: "fabri@example.com",
      shipping_type: "pickup",
      shipping_address_json: {
        postalCode: "1744",
        address: "Sucursal centro",
        locality: "Moreno",
      },
      notes: "Retira manana",
      subtotal: 30,
      discount: 10,
      shipping_cost: 0,
      total: 30,
      status: "pending",
      payment_status: "pending",
      order_items: [
        {
          product_id: "prod_1",
          product_name: "Creatina",
          quantity: 2,
          unit_price: 20,
          promo_price: 15,
          line_total: 30,
        },
      ],
      payments: [
        {
          id: "pay_1",
          payment_method: "mercadopago",
          status: "pending",
        },
      ],
    });

    expect(buildMercadoPagoItems(order)).toEqual([
      {
        id: "prod_1",
        title: "Creatina",
        quantity: 2,
        currency_id: "ARS",
        unit_price: 15,
      },
    ]);

    expect(buildMercadoPagoShipments(order)).toEqual({
      local_pickup: true,
      cost: 0,
      free_shipping: true,
      receiver_address: {
        zip_code: "1744",
        street_name: "Sucursal centro",
        city_name: "Moreno",
        street_number: 0,
        country_name: "Argentina",
      },
    });
  });
});

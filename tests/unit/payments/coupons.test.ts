import { describe, expect, it } from "vitest";

import {
  getBaseSubtotalFromOrderItems,
  getEffectiveSubtotalFromOrderItems,
  mapCouponRow,
  normalizeCouponCode,
  resolveCouponDiscount,
  validateCouponResolution,
} from "../../../src/shared/payments/coupons";

function buildCouponRow(overrides = {}) {
  return {
    id: "coupon-1",
    code: "grizzly10",
    name: "Grizzly 10",
    description: "Descuento de prueba",
    coupon_type: "percentage",
    coupon_scope: "order",
    discount_value: 10,
    min_order_total: 0,
    max_discount_amount: null,
    usage_limit: null,
    per_user_limit: null,
    starts_at: null,
    ends_at: null,
    is_active: true,
    ...overrides,
  };
}

describe("shared/payments/coupons", () => {
  it("normaliza el codigo del cupon y los datos base", () => {
    const coupon = mapCouponRow(buildCouponRow());

    expect(normalizeCouponCode("  grizzly 10 ")).toBe("GRIZZLY10");
    expect(coupon?.code).toBe("GRIZZLY10");
    expect(coupon?.couponType).toBe("percentage");
    expect(coupon?.couponScope).toBe("order");
  });

  it("calcula subtotales base y efectivos a partir de order_items", () => {
    const items = [
      {
        unit_price: 20,
        quantity: 2,
        line_total: 30,
      },
      {
        unit_price: 10,
        quantity: 1,
        line_total: 10,
      },
    ];

    expect(getBaseSubtotalFromOrderItems(items)).toBe(50);
    expect(getEffectiveSubtotalFromOrderItems(items)).toBe(40);
  });

  it("resuelve porcentaje con tope maximo y monto fijo sobre envio", () => {
    const percentageCoupon = mapCouponRow(
      buildCouponRow({
        discount_value: 20,
        max_discount_amount: 5,
      }),
    );
    const shippingCoupon = mapCouponRow(
      buildCouponRow({
        coupon_type: "fixed",
        coupon_scope: "shipping",
        discount_value: 8,
      }),
    );

    expect(
      resolveCouponDiscount({
        coupon: percentageCoupon,
        orderAmount: 40,
        shippingCost: 10,
      }),
    ).toBe(5);

    expect(
      resolveCouponDiscount({
        coupon: shippingCoupon,
        orderAmount: 40,
        shippingCost: 6,
      }),
    ).toBe(6);
  });

  it("rechaza cupones inactivos, vencidos o fuera de condiciones", () => {
    const inactiveCoupon = mapCouponRow(buildCouponRow({ is_active: false }));
    const expiredCoupon = mapCouponRow(
      buildCouponRow({
        ends_at: "2025-01-01T00:00:00.000Z",
      }),
    );
    const minOrderCoupon = mapCouponRow(
      buildCouponRow({
        min_order_total: 100,
      }),
    );
    const futureCoupon = mapCouponRow(
      buildCouponRow({
        starts_at: "2030-01-01T00:00:00.000Z",
      }),
    );

    expect(
      validateCouponResolution({
        coupon: inactiveCoupon,
        orderAmount: 50,
        shippingCost: 10,
      }).ok,
    ).toBe(false);

    expect(
      validateCouponResolution({
        coupon: expiredCoupon,
        orderAmount: 50,
        shippingCost: 10,
        now: new Date("2026-05-22T00:00:00.000Z"),
      }).error,
    ).toContain("no esta vigente");

    expect(
      validateCouponResolution({
        coupon: futureCoupon,
        orderAmount: 50,
        shippingCost: 10,
        now: new Date("2026-05-22T00:00:00.000Z"),
      }).error,
    ).toContain("no esta vigente");

    expect(
      validateCouponResolution({
        coupon: minOrderCoupon,
        orderAmount: 40,
        shippingCost: 10,
      }).error,
    ).toContain("subtotal minimo");
  });

  it("rechaza cupones por limites de uso", () => {
    const globalLimitedCoupon = mapCouponRow(
      buildCouponRow({
        usage_limit: 5,
      }),
    );
    const userLimitedCoupon = mapCouponRow(
      buildCouponRow({
        per_user_limit: 1,
      }),
    );

    expect(
      validateCouponResolution({
        coupon: globalLimitedCoupon,
        orderAmount: 50,
        shippingCost: 10,
        totalUsageCount: 5, // Límite alcanzado
      }).error,
    ).toContain("limite total de usos");

    expect(
      validateCouponResolution({
        coupon: userLimitedCoupon,
        orderAmount: 50,
        shippingCost: 10,
        hasKnownUser: true,
        userUsageCount: 1, // Límite alcanzado por el usuario
      }).error,
    ).toContain("maximo permitido para tu cuenta");
  });

  it("rechaza cupon de envio si no hay costo de envio", () => {
    const shippingCoupon = mapCouponRow(
      buildCouponRow({
        coupon_type: "percentage",
        coupon_scope: "shipping",
        discount_value: 100,
      }),
    );

    expect(
      validateCouponResolution({
        coupon: shippingCoupon,
        orderAmount: 50,
        shippingCost: 0, // Envío gratis
      }).error,
    ).toContain("no tiene costo de envio");
  });

  it("aprueba cupones validos y devuelve el descuento real", () => {
    const coupon = mapCouponRow(
      buildCouponRow({
        discount_value: 15,
        usage_limit: 10,
      }),
    );

    const result = validateCouponResolution({
      coupon,
      orderAmount: 80,
      shippingCost: 10,
      totalUsageCount: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.discountAmount).toBe(12);
  });
});

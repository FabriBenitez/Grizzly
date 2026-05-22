import { cabecerasCors } from "../_shared/cors.ts";
import { normalizeCouponCode } from "../../../src/shared/payments/coupons.ts";
import { resolveCouponForCheckout } from "../_shared/coupons.ts";

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: cabecerasCors,
  });
}

type ValidateCouponPayload = {
  code?: string;
  orderAmount?: number;
  shippingCost?: number;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Metodo no permitido." }, 405);
  }

  try {
    const payload = (await request.json()) as ValidateCouponPayload;
    const code = normalizeCouponCode(payload.code);
    const orderAmount = Number(payload.orderAmount || 0);
    const shippingCost = Number(payload.shippingCost || 0);

    if (!code) {
      return jsonResponse({ ok: false, error: "Ingresa un codigo de cupon." }, 400);
    }

    const resolution = await resolveCouponForCheckout({
      code,
      orderAmount,
      shippingCost,
    });

    if (!resolution.ok || !resolution.coupon) {
      return jsonResponse({ ok: false, error: resolution.error }, 400);
    }

    return jsonResponse(
      {
        ok: true,
        coupon: {
          id: resolution.coupon.id,
          code: resolution.coupon.code,
          name: resolution.coupon.name,
          description: resolution.coupon.description,
          couponType: resolution.coupon.couponType,
          couponScope: resolution.coupon.couponScope,
        },
        discountAmount: resolution.discountAmount,
        totalAfterDiscount: Number(
          Math.max(0, orderAmount + shippingCost - resolution.discountAmount).toFixed(2),
        ),
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido.";

    return jsonResponse(
      {
        ok: false,
        error: message,
      },
      500,
    );
  }
});

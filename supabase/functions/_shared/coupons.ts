import {
  mapCouponRow,
  normalizeCouponCode,
  validateCouponResolution,
  type CouponDefinition,
  type CouponResolution,
} from "../../../src/shared/payments/coupons.ts";
import { crearClienteAdminSupabase } from "./supabaseAdmin.ts";

async function fetchCouponByCode(code: string): Promise<CouponDefinition | null> {
  const safeCode = normalizeCouponCode(code);

  if (!safeCode) {
    return null;
  }

  const supabase = crearClienteAdminSupabase();
  const { data, error } = await supabase.from("coupons").select("*").eq("code", safeCode).maybeSingle();

  if (error) {
    throw new Error(error.message || "No pudimos consultar el cupon solicitado.");
  }

  return mapCouponRow((data as Record<string, unknown> | null) ?? null);
}

async function countCouponUsages(couponId: string) {
  const supabase = crearClienteAdminSupabase();
  const { count, error } = await supabase
    .from("coupon_usages")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId);

  if (error) {
    throw new Error(error.message || "No pudimos validar el historial del cupon.");
  }

  return count || 0;
}

export async function resolveCouponForCheckout(options: {
  code?: string | null;
  orderAmount: number;
  shippingCost: number;
  hasKnownUser?: boolean;
  userUsageCount?: number;
}): Promise<CouponResolution> {
  const safeCode = normalizeCouponCode(options.code);

  if (!safeCode) {
    return {
      ok: true,
      coupon: null,
      discountAmount: 0,
      error: "",
    };
  }

  const coupon = await fetchCouponByCode(safeCode);
  const totalUsageCount = coupon ? await countCouponUsages(coupon.id) : 0;

  return validateCouponResolution({
    coupon,
    orderAmount: options.orderAmount,
    shippingCost: options.shippingCost,
    totalUsageCount,
    userUsageCount: options.userUsageCount || 0,
    hasKnownUser: options.hasKnownUser || false,
  });
}

export function buildCouponUsagePayload(options: {
  coupon: CouponDefinition;
  orderId: string;
  discountAmount: number;
  userId?: string | null;
}) {
  return {
    coupon_id: options.coupon.id,
    order_id: options.orderId,
    user_id: options.userId || null,
    code_snapshot: options.coupon.code,
    discount_amount: options.discountAmount,
  };
}

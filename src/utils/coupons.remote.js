import { supabase } from "../lib/supabase";
import { PublicEdgeFunctionError, invokePublicEdgeFunction } from "../lib/edgeFunctions.public";
import { mapCouponRow, normalizeCouponCode } from "../shared/payments/coupons.ts";

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase no esta configurado. Completa VITE_SUPABASE_URL y la clave publica en .env.local.",
    );
  }

  return supabase;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed) : 0;
}

export function normalizeRemoteCoupon(row) {
  const coupon = mapCouponRow(row);

  if (!coupon) {
    return null;
  }

  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    description: coupon.description,
    couponType: coupon.couponType,
    couponScope: coupon.couponScope,
    discountValue: coupon.discountValue,
    minOrderTotal: coupon.minOrderTotal,
    maxDiscountAmount: coupon.maxDiscountAmount,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    active: coupon.isActive,
    createdAt: normalizeText(row?.created_at),
    updatedAt: normalizeText(row?.updated_at),
  };
}

export async function fetchAdminCouponsFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No pudimos cargar los cupones desde la base.");
  }

  return (data || [])
    .map((row) => normalizeRemoteCoupon(row))
    .filter(Boolean);
}

export async function saveAdminCoupon(draft) {
  const client = requireSupabase();
  const payload = {
    id: normalizeText(draft?.id) || undefined,
    code: normalizeCouponCode(draft?.code),
    name: normalizeText(draft?.name) || "Cupon comercial",
    description: normalizeText(draft?.description) || null,
    coupon_type: draft?.couponType === "fixed" ? "fixed" : "percentage",
    coupon_scope: draft?.couponScope === "shipping" ? "shipping" : "order",
    discount_value: Math.max(0, normalizeNumber(draft?.discountValue)),
    min_order_total: Math.max(0, normalizeNumber(draft?.minOrderTotal)),
    max_discount_amount:
      draft?.maxDiscountAmount === "" || draft?.maxDiscountAmount == null
        ? null
        : Math.max(0, normalizeNumber(draft?.maxDiscountAmount)),
    usage_limit:
      draft?.usageLimit === "" || draft?.usageLimit == null
        ? null
        : Math.max(0, Math.floor(normalizeNumber(draft?.usageLimit))),
    per_user_limit:
      draft?.perUserLimit === "" || draft?.perUserLimit == null
        ? null
        : Math.max(0, Math.floor(normalizeNumber(draft?.perUserLimit))),
    starts_at: normalizeText(draft?.startsAt) || null,
    ends_at: normalizeText(draft?.endsAt) || null,
    is_active: Boolean(draft?.active),
  };

  if (!payload.code) {
    throw new Error("Define un codigo valido para el cupon.");
  }

  const { error } = await client.from("coupons").upsert(payload).select("id");

  if (error) {
    throw new Error(error.message || "No pudimos guardar el cupon.");
  }
}

export async function deleteAdminCoupon(id) {
  const client = requireSupabase();
  const safeId = normalizeText(id);

  if (!safeId) {
    return;
  }

  const { error } = await client.from("coupons").delete().eq("id", safeId);

  if (error) {
    throw new Error(error.message || "No pudimos eliminar el cupon.");
  }
}

export async function validatePublicCoupon({ code, orderAmount, shippingCost }) {
  const safeCode = normalizeCouponCode(code);

  if (!safeCode) {
    throw new Error("Ingresa un codigo de cupon.");
  }

  try {
    const data = await invokePublicEdgeFunction("validate-coupon", {
      code: safeCode,
      orderAmount,
      shippingCost,
    });

    if (!data?.ok || !data?.coupon) {
      throw new Error(data?.error || "No pudimos validar el cupon.");
    }

    return data;
  } catch (error) {
    if (error instanceof PublicEdgeFunctionError && error.body?.error) {
      throw new Error(String(error.body.error) || "No pudimos validar el cupon.");
    }

    throw new Error(error.message || "No pudimos validar el cupon.");
  }
}

export type CouponType = "percentage" | "fixed";
export type CouponScope = "order" | "shipping";

export type CouponDefinition = {
  id: string;
  code: string;
  name: string;
  description: string;
  couponType: CouponType;
  couponScope: CouponScope;
  discountValue: number;
  minOrderTotal: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export type CouponResolution = {
  ok: boolean;
  coupon: CouponDefinition | null;
  discountAmount: number;
  error: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function normalizeInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function normalizeCouponCode(value: unknown) {
  return normalizeText(value).replace(/\s+/g, "").toUpperCase();
}

export function mapCouponRow(row: Record<string, unknown> | null | undefined): CouponDefinition | null {
  if (!row) {
    return null;
  }

  const couponType =
    normalizeText(row.coupon_type).toLowerCase() === "fixed" ? "fixed" : "percentage";
  const couponScope =
    normalizeText(row.coupon_scope).toLowerCase() === "shipping" ? "shipping" : "order";

  return {
    id: normalizeText(row.id),
    code: normalizeCouponCode(row.code),
    name: normalizeText(row.name) || "Cupon",
    description: normalizeText(row.description),
    couponType,
    couponScope,
    discountValue: normalizeNumber(row.discount_value),
    minOrderTotal: normalizeNumber(row.min_order_total),
    maxDiscountAmount:
      row.max_discount_amount == null ? null : normalizeNumber(row.max_discount_amount),
    usageLimit: row.usage_limit == null ? null : normalizeInteger(row.usage_limit),
    perUserLimit: row.per_user_limit == null ? null : normalizeInteger(row.per_user_limit),
    startsAt: normalizeText(row.starts_at),
    endsAt: normalizeText(row.ends_at),
    isActive: Boolean(row.is_active),
  };
}

export function getBaseSubtotalFromOrderItems(
  items: Array<{ unit_price?: number; quantity?: number }> = [],
) {
  return normalizeNumber(
    items.reduce(
      (acc, item) => acc + normalizeNumber(item.unit_price) * Math.max(1, Number(item.quantity) || 1),
      0,
    ),
  );
}

export function getEffectiveSubtotalFromOrderItems(
  items: Array<{ line_total?: number }> = [],
) {
  return normalizeNumber(
    items.reduce((acc, item) => acc + normalizeNumber(item.line_total), 0),
  );
}

export function isCouponInActiveWindow(coupon: CouponDefinition, now = new Date()) {
  const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null;
  const endsAt = coupon.endsAt ? new Date(coupon.endsAt) : null;

  if (startsAt && Number.isFinite(startsAt.valueOf()) && startsAt > now) {
    return false;
  }

  if (endsAt && Number.isFinite(endsAt.valueOf()) && endsAt < now) {
    return false;
  }

  return true;
}

export function resolveCouponDiscount(options: {
  coupon: CouponDefinition;
  orderAmount: number;
  shippingCost: number;
}) {
  const orderAmount = normalizeNumber(options.orderAmount);
  const shippingCost = normalizeNumber(options.shippingCost);
  const baseAmount = options.coupon.couponScope === "shipping" ? shippingCost : orderAmount;

  if (baseAmount <= 0) {
    return 0;
  }

  let discountAmount =
    options.coupon.couponType === "percentage"
      ? baseAmount * (options.coupon.discountValue / 100)
      : options.coupon.discountValue;

  if (options.coupon.maxDiscountAmount != null) {
    discountAmount = Math.min(discountAmount, options.coupon.maxDiscountAmount);
  }

  if (options.coupon.couponScope === "shipping") {
    discountAmount = Math.min(discountAmount, shippingCost);
  } else {
    discountAmount = Math.min(discountAmount, orderAmount);
  }

  return normalizeNumber(discountAmount);
}

export function validateCouponResolution(options: {
  coupon: CouponDefinition | null;
  orderAmount: number;
  shippingCost: number;
  totalUsageCount?: number;
  userUsageCount?: number;
  hasKnownUser?: boolean;
  now?: Date;
}) {
  const coupon = options.coupon;
  const orderAmount = normalizeNumber(options.orderAmount);
  const shippingCost = normalizeNumber(options.shippingCost);
  const totalUsageCount = normalizeInteger(options.totalUsageCount);
  const userUsageCount = normalizeInteger(options.userUsageCount);
  const now = options.now || new Date();

  if (!coupon) {
    return {
      ok: false,
      coupon: null,
      discountAmount: 0,
      error: "No encontramos un cupon activo con ese codigo.",
    } satisfies CouponResolution;
  }

  if (!coupon.isActive) {
    return {
      ok: false,
      coupon,
      discountAmount: 0,
      error: "Este cupon esta inactivo en este momento.",
    } satisfies CouponResolution;
  }

  if (!isCouponInActiveWindow(coupon, now)) {
    return {
      ok: false,
      coupon,
      discountAmount: 0,
      error: "Este cupon no esta vigente para usar ahora.",
    } satisfies CouponResolution;
  }

  if (coupon.minOrderTotal > orderAmount) {
    return {
      ok: false,
      coupon,
      discountAmount: 0,
      error: `Este cupon requiere un subtotal minimo de ${coupon.minOrderTotal}.`,
    } satisfies CouponResolution;
  }

  if (coupon.couponScope === "shipping" && shippingCost <= 0) {
    return {
      ok: false,
      coupon,
      discountAmount: 0,
      error: "Este cupon aplica al envio y tu pedido no tiene costo de envio.",
    } satisfies CouponResolution;
  }

  if (coupon.usageLimit != null && totalUsageCount >= coupon.usageLimit) {
    return {
      ok: false,
      coupon,
      discountAmount: 0,
      error: "Este cupon ya alcanzo el limite total de usos.",
    } satisfies CouponResolution;
  }

  if (
    options.hasKnownUser &&
    coupon.perUserLimit != null &&
    userUsageCount >= coupon.perUserLimit
  ) {
    return {
      ok: false,
      coupon,
      discountAmount: 0,
      error: "Ya usaste este cupon el maximo permitido para tu cuenta.",
    } satisfies CouponResolution;
  }

  const discountAmount = resolveCouponDiscount({
    coupon,
    orderAmount,
    shippingCost,
  });

  if (discountAmount <= 0) {
    return {
      ok: false,
      coupon,
      discountAmount: 0,
      error: "No pudimos aplicar descuento con este cupon sobre el pedido actual.",
    } satisfies CouponResolution;
  }

  return {
    ok: true,
    coupon,
    discountAmount,
    error: "",
  } satisfies CouponResolution;
}

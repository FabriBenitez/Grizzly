import { hasLettersOnly, hasNumbersOnly } from "../forms/inputRules";

export const PAYMENT_METHODS = {
  mercadoPago: "mercadopago",
  transferencia: "transferencia",
} as const;

export type CheckoutItemInput = {
  id?: string;
  name?: string;
  quantity?: number;
  basePrice?: number;
  effectivePrice?: number;
  lineTotal?: number;
};

export type CheckoutPayload = {
  orderNumber?: string;
  paymentMethod?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  items?: CheckoutItemInput[];
  totals?: {
    subtotal?: number;
    discount?: number;
    shipping?: number;
    total?: number;
  };
  delivery?: {
    type?: string;
    address?: string;
    locality?: string;
    postalCode?: string;
    branch?: {
      id?: string;
      name?: string;
      address?: string;
      city?: string;
      hours?: string;
    } | null;
  };
  observation?: string;
};

export type NormalizedOrderItem = {
  product_id: string | null;
  product_name: string;
  unit_price: number;
  promo_price: number | null;
  quantity: number;
  line_total: number;
};

export type ValidatedCheckoutPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: string;
  items: NormalizedOrderItem[];
  delivery: {
    type: string;
    address: string;
    locality: string;
    postalCode: string;
    branch: CheckoutPayload["delivery"]["branch"] | null;
  };
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
  };
  observation: string;
  errors: string[];
};

export type NormalizedExistingOrderItem = {
  id: string;
  name: string;
  quantity: number;
  basePrice: number;
  effectivePrice: number;
  lineTotal: number;
};

export type NormalizedExistingOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingType: string;
  shippingAddress: Record<string, unknown> | null;
  notes: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  status: string;
  paymentStatus: string;
  items: NormalizedExistingOrderItem[];
  payment: {
    id: string;
    paymentMethod: string;
    paymentStatus: string;
  } | null;
};

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isUuid(value: string | undefined) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function splitFullName(fullName: string) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  const [name = fullName, ...rest] = parts;

  return {
    name,
    surname: rest.join(" "),
  };
}

export function mapShippingType(type: string) {
  const normalized = normalizeText(type).toLowerCase();
  return normalized === "pickup" || normalized === "retiro" ? "pickup" : "delivery";
}

export function resolvePublicAppUrlFromCandidates(candidates: string[]) {
  for (const candidate of candidates.map((value) => normalizeText(value)).filter(Boolean)) {
    try {
      const parsed = new URL(candidate);
      const hostname = parsed.hostname.toLowerCase();
      const isHttps = parsed.protocol === "https:";
      const isLocalHost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0" ||
        hostname.endsWith(".local");

      if (isHttps && !isLocalHost) {
        return parsed.toString().replace(/\/$/, "");
      }
    } catch {
      // Ignoramos valores invalidos y seguimos con el siguiente candidato.
    }
  }

  return "";
}

export function resolvePublicAppUrl(options: {
  appUrl?: string | null;
  requestOrigin?: string | null;
}) {
  return resolvePublicAppUrlFromCandidates([options.appUrl || "", options.requestOrigin || ""]);
}

export function buildShippingAddress(delivery: CheckoutPayload["delivery"]) {
  return {
    type: normalizeText(delivery?.type) || "correo",
    address: normalizeText(delivery?.address),
    locality: normalizeText(delivery?.locality),
    postalCode: normalizeText(delivery?.postalCode),
    branch: delivery?.branch ?? null,
  };
}

export function buildOrderItems(items: CheckoutItemInput[] = []) {
  return items.map((item) => {
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const unitPrice = normalizeNumber(item.basePrice);
    const effectivePrice = normalizeNumber(item.effectivePrice || item.basePrice);
    const lineTotal = normalizeNumber(item.lineTotal || effectivePrice * quantity);

    return {
      product_id: isUuid(item.id) ? item.id : null,
      product_name: normalizeText(item.name) || "Producto sin nombre",
      unit_price: unitPrice,
      promo_price: effectivePrice < unitPrice ? effectivePrice : null,
      quantity,
      line_total: lineTotal,
    };
  });
}

export function validateNewCheckoutPayload(payload: CheckoutPayload): ValidatedCheckoutPayload {
  const errors: string[] = [];
  const customerName = normalizeText(payload.customer?.name);
  const customerPhone = normalizeText(payload.customer?.phone);
  const customerEmail = normalizeText(payload.customer?.email).toLowerCase();
  const paymentMethod = normalizeText(payload.paymentMethod).toLowerCase();
  const items = buildOrderItems(payload.items);
  const delivery = buildShippingAddress(payload.delivery);

  if (!customerName) {
    errors.push("Falta el nombre del cliente.");
  }

  if (!customerPhone) {
    errors.push("Falta el telefono del cliente.");
  }

  if (customerName && !hasLettersOnly(customerName)) {
    errors.push("El nombre del cliente solo puede contener letras.");
  }

  if (customerPhone && !hasNumbersOnly(customerPhone)) {
    errors.push("El telefono del cliente solo puede contener numeros.");
  }

  if (!customerEmail || !isValidEmail(customerEmail)) {
    errors.push("El email del cliente es obligatorio para continuar.");
  }

  if (!items.length) {
    errors.push("No hay productos para generar la orden.");
  }

  if (
    paymentMethod !== PAYMENT_METHODS.mercadoPago &&
    paymentMethod !== PAYMENT_METHODS.transferencia
  ) {
    errors.push("La forma de pago seleccionada no es valida.");
  }

  if (!delivery.address || !delivery.locality || !delivery.postalCode) {
    errors.push("Faltan datos de envio.");
  }

  if (delivery.locality && !hasLettersOnly(delivery.locality)) {
    errors.push("La localidad solo puede contener letras.");
  }

  if (delivery.postalCode && !hasNumbersOnly(delivery.postalCode)) {
    errors.push("El codigo postal solo puede contener numeros.");
  }

  const subtotal = normalizeNumber(payload.totals?.subtotal);
  const total = normalizeNumber(payload.totals?.total);

  if (subtotal <= 0 || total <= 0) {
    errors.push("Los totales del pedido no son validos.");
  }

  return {
    customerName,
    customerPhone,
    customerEmail,
    paymentMethod,
    items,
    delivery,
    totals: {
      subtotal,
      discount: normalizeNumber(payload.totals?.discount),
      shipping: normalizeNumber(payload.totals?.shipping),
      total,
    },
    observation: normalizeText(payload.observation),
    errors,
  };
}

function getPrimaryPayment(payments: unknown) {
  if (Array.isArray(payments)) {
    return payments[0] ?? null;
  }

  if (payments && typeof payments === "object") {
    return payments;
  }

  return null;
}

export function normalizeExistingOrder(order: Record<string, unknown>): NormalizedExistingOrder {
  const payment = getPrimaryPayment(order.payments);
  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

  return {
    id: String(order.id),
    orderNumber: String(order.order_number),
    customerName: normalizeText(order.customer_name),
    customerPhone: normalizeText(order.customer_phone),
    customerEmail: normalizeText(order.customer_email),
    shippingType: String(order.shipping_type || "delivery"),
    shippingAddress: (order.shipping_address_json as Record<string, unknown> | null) ?? null,
    notes: normalizeText(order.notes),
    subtotal: normalizeNumber(order.subtotal),
    discount: normalizeNumber(order.discount),
    shippingCost: normalizeNumber(order.shipping_cost),
    total: normalizeNumber(order.total),
    status: normalizeText(order.status),
    paymentStatus: normalizeText(order.payment_status),
    items: orderItems.map((item) => ({
      id: normalizeText((item as Record<string, unknown>).product_id),
      name: normalizeText((item as Record<string, unknown>).product_name),
      quantity: Math.max(1, Number((item as Record<string, unknown>).quantity) || 1),
      basePrice: normalizeNumber((item as Record<string, unknown>).unit_price),
      effectivePrice: normalizeNumber(
        (item as Record<string, unknown>).promo_price ||
          (item as Record<string, unknown>).unit_price,
      ),
      lineTotal: normalizeNumber((item as Record<string, unknown>).line_total),
    })),
    payment: payment
      ? {
          id: String((payment as Record<string, unknown>).id),
          paymentMethod: normalizeText((payment as Record<string, unknown>).payment_method),
          paymentStatus: normalizeText((payment as Record<string, unknown>).status),
        }
      : null,
  };
}

export function buildMercadoPagoItems(order: NormalizedExistingOrder) {
  return order.items.map((item) => ({
    id: item.id || item.name,
    title: item.name,
    quantity: item.quantity,
    currency_id: "ARS",
    unit_price: Number((item.lineTotal / item.quantity).toFixed(2)),
  }));
}

export function buildMercadoPagoShipments(order: NormalizedExistingOrder) {
  const shippingAddress = order.shippingAddress ?? {};

  return {
    local_pickup: order.shippingType === "pickup",
    cost: order.shippingCost,
    free_shipping: order.shippingCost === 0,
    receiver_address: {
      zip_code: normalizeText(shippingAddress.postalCode),
      street_name: normalizeText(shippingAddress.address),
      city_name: normalizeText(shippingAddress.locality),
      street_number: 0,
      country_name: "Argentina",
    },
  };
}

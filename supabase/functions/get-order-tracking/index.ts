import { cabecerasCors } from "../_shared/cors.ts";
import { crearClienteAdminSupabase } from "../_shared/supabaseAdmin.ts";

const ORDER_SELECT = `
  id,
  order_number,
  customer_name,
  customer_email,
  customer_phone,
  shipping_type,
  shipping_address_json,
  notes,
  subtotal,
  discount,
  shipping_cost,
  total,
  status,
  payment_status,
  created_at,
  updated_at,
  order_items (
    id,
    product_id,
    product_name,
    unit_price,
    promo_price,
    quantity,
    line_total
  ),
  payments (
    id,
    status,
    payment_method,
    preference_id,
    payment_id,
    approved_at,
    rejected_at,
    updated_at
  ),
  order_status_history (
    previous_status,
    new_status,
    changed_at
  )
`;

const DB_TO_UI_STATUS = {
  pending: "Pendiente de pago",
  paid: "Pago confirmado",
  packing: "En preparacion",
  shipped: "Despachado",
  delivered: "Entregado",
  cancelled: "Cancelado",
} as const;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: cabecerasCors,
  });
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
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

function mapPaymentMethodToLabel(method: string) {
  const normalized = method.toLowerCase();

  if (normalized === "mercadopago") {
    return "Mercado Pago";
  }

  if (normalized === "transferencia") {
    return "Transferencia";
  }

  return method || "Sin definir";
}

function resolveUiStatus(order: Record<string, unknown>, payment: Record<string, unknown> | null) {
  const dbStatus = normalizeText(order.status);
  const paymentStatus = normalizeText(payment?.status || order.payment_status);

  if (dbStatus === "cancelled") {
    return DB_TO_UI_STATUS.cancelled;
  }

  if (dbStatus === "delivered") {
    return DB_TO_UI_STATUS.delivered;
  }

  if (dbStatus === "shipped") {
    return DB_TO_UI_STATUS.shipped;
  }

  if (dbStatus === "packing") {
    return DB_TO_UI_STATUS.packing;
  }

  if (dbStatus === "paid" || paymentStatus === "approved") {
    return DB_TO_UI_STATUS.paid;
  }

  return DB_TO_UI_STATUS.pending;
}

function mapHistoryStatus(status: string) {
  return DB_TO_UI_STATUS[status as keyof typeof DB_TO_UI_STATUS] || DB_TO_UI_STATUS.pending;
}

function buildStatusHistory(order: Record<string, unknown>, uiStatus: string) {
  const historyRows = Array.isArray(order.order_status_history)
    ? [...order.order_status_history]
    : [];

  if (!historyRows.length) {
    return [
      {
        status: uiStatus,
        timestamp: normalizeText(order.updated_at || order.created_at),
      },
    ];
  }

  const normalized = historyRows
    .map((entry) => ({
      status: mapHistoryStatus(normalizeText((entry as Record<string, unknown>).new_status)),
      timestamp:
        normalizeText((entry as Record<string, unknown>).changed_at) ||
        normalizeText(order.created_at),
    }))
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

  if (normalized[normalized.length - 1]?.status !== uiStatus) {
    normalized.push({
      status: uiStatus,
      timestamp: normalizeText(order.updated_at || order.created_at),
    });
  }

  return normalized;
}

function normalizeOrder(order: Record<string, unknown>) {
  const payment = getPrimaryPayment(order.payments) as Record<string, unknown> | null;
  const uiStatus = resolveUiStatus(order, payment);
  const shippingAddress = (order.shipping_address_json as Record<string, unknown> | null) ?? {};

  return {
    id: String(order.id),
    number: String(order.order_number),
    createdAt: normalizeText(order.created_at),
    status: uiStatus,
    paymentStatus: normalizeText(payment?.status || order.payment_status),
    paymentMethod: mapPaymentMethodToLabel(normalizeText(payment?.payment_method)),
    customer: {
      name: normalizeText(order.customer_name),
      phone: normalizeText(order.customer_phone),
      email: normalizeText(order.customer_email),
    },
    delivery: {
      type: normalizeText(order.shipping_type) === "pickup" ? "retiro" : "envio",
      address: normalizeText(shippingAddress.address),
      locality: normalizeText(shippingAddress.locality),
      postalCode: normalizeText(shippingAddress.postalCode),
      branch: shippingAddress.branch ?? null,
    },
    totals: {
      subtotal: normalizeNumber(order.subtotal),
      discount: normalizeNumber(order.discount),
      shipping: normalizeNumber(order.shipping_cost),
      total: normalizeNumber(order.total),
    },
    items: (Array.isArray(order.order_items) ? order.order_items : []).map((item) => ({
      id: normalizeText((item as Record<string, unknown>).product_id) || String((item as Record<string, unknown>).id),
      name: normalizeText((item as Record<string, unknown>).product_name),
      quantity: Math.max(1, Number((item as Record<string, unknown>).quantity) || 1),
      subtotal: normalizeNumber((item as Record<string, unknown>).line_total),
    })),
    observation: normalizeText(order.notes),
    statusHistory: buildStatusHistory(order, uiStatus),
    canCancel: false,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Metodo no permitido." }, 405);
  }

  try {
    const body = (await request.json()) as {
      orderNumber?: string;
      phone?: string;
    };

    const orderNumber = normalizeText(body.orderNumber).toUpperCase();
    const phone = normalizePhoneDigits(normalizeText(body.phone));

    if (!orderNumber) {
      return jsonResponse({ ok: false, error: "Falta el numero de pedido." }, 400);
    }

    const supabase = crearClienteAdminSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "No pudimos consultar el pedido.");
    }

    if (!data) {
      return jsonResponse({ ok: false, error: "No encontramos ese pedido." }, 404);
    }

    const orderPhone = normalizePhoneDigits(normalizeText((data as Record<string, unknown>).customer_phone));

    if (phone && !orderPhone.endsWith(phone)) {
      return jsonResponse(
        {
          ok: false,
          error: "No encontramos un pedido con esos datos.",
        },
        404,
      );
    }

    return jsonResponse(
      {
        ok: true,
        order: normalizeOrder(data as Record<string, unknown>),
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido.";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});

import { supabase } from "../lib/supabase";
import { PublicEdgeFunctionError, invokePublicEdgeFunction } from "../lib/edgeFunctions.public";
import { normalizeOrderRecord } from "./orders";

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
    provider,
    preference_id,
    payment_id,
    external_reference,
    amount,
    status,
    payment_method,
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
};

const UI_TO_DB_STATUS = {
  "Pendiente de pago": {
    status: "pending",
    payment_status: "pending",
  },
  "Pago confirmado": {
    status: "paid",
    payment_status: "approved",
  },
  "En preparacion": {
    status: "packing",
    payment_status: "approved",
  },
  Despachado: {
    status: "shipped",
    payment_status: "approved",
  },
  Entregado: {
    status: "delivered",
    payment_status: "approved",
  },
  Cancelado: {
    status: "cancelled",
    payment_status: "rejected",
  },
  Vencido: {
    status: "cancelled",
    payment_status: "rejected",
  },
};

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
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function getPrimaryPayment(payments) {
  if (Array.isArray(payments)) {
    return payments[0] || null;
  }

  if (payments && typeof payments === "object") {
    return payments;
  }

  return null;
}

function mapPaymentMethodToLabel(method) {
  const normalized = normalizeText(method).toLowerCase();

  if (normalized === "mercadopago") {
    return "Mercado Pago";
  }

  if (normalized === "transferencia") {
    return "Transferencia";
  }

  return normalizeText(method) || "Sin definir";
}

async function sendOrderEmailNotification(payload) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("send-order-email", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "No pudimos enviar el email asociado al pedido.");
  }
}

function mapDbStatusToUiStatus(orderRow, payment) {
  const dbStatus = normalizeText(orderRow.status);
  const paymentStatus = normalizeText(payment?.status || orderRow.payment_status);

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

function mapStatusHistoryEntry(entry) {
  const nextStatus = normalizeText(entry?.new_status);
  return {
    status: DB_TO_UI_STATUS[nextStatus] || DB_TO_UI_STATUS.pending,
    timestamp: normalizeText(entry?.changed_at),
  };
}

function buildStatusHistory(orderRow, uiStatus) {
  const historyRows = Array.isArray(orderRow.order_status_history)
    ? [...orderRow.order_status_history]
    : [];

  if (!historyRows.length) {
    return [
      {
        status: uiStatus,
        timestamp: normalizeText(orderRow.updated_at || orderRow.created_at),
      },
    ];
  }

  const normalized = historyRows
    .map(mapStatusHistoryEntry)
    .filter((entry) => entry.timestamp)
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

  if (!normalized.length) {
    return [
      {
        status: uiStatus,
        timestamp: normalizeText(orderRow.updated_at || orderRow.created_at),
      },
    ];
  }

  if (normalized[normalized.length - 1]?.status !== uiStatus) {
    normalized.push({
      status: uiStatus,
      timestamp: normalizeText(orderRow.updated_at || orderRow.created_at),
    });
  }

  return normalized;
}

export function normalizeRemoteOrder(orderRow) {
  const payment = getPrimaryPayment(orderRow.payments);
  const shippingAddress = orderRow.shipping_address_json || {};
  const uiStatus = mapDbStatusToUiStatus(orderRow, payment);

  return normalizeOrderRecord({
    id: orderRow.id,
    number: orderRow.order_number,
    createdAt: orderRow.created_at,
    status: uiStatus,
    customer: {
      name: normalizeText(orderRow.customer_name),
      phone: normalizeText(orderRow.customer_phone),
      email: normalizeText(orderRow.customer_email),
    },
    delivery: {
      type: normalizeText(orderRow.shipping_type) === "pickup" ? "retiro" : "envio",
      serviceType: normalizeText(shippingAddress.type),
      address: normalizeText(shippingAddress.address),
      locality: normalizeText(shippingAddress.locality),
      postalCode: normalizeText(shippingAddress.postalCode),
      branch: shippingAddress.branch || null,
    },
    totals: {
      subtotal: normalizeNumber(orderRow.subtotal),
      discount: normalizeNumber(orderRow.discount),
      shipping: normalizeNumber(orderRow.shipping_cost),
      total: normalizeNumber(orderRow.total),
    },
    items: (Array.isArray(orderRow.order_items) ? orderRow.order_items : []).map((item) => ({
      id: normalizeText(item.product_id) || String(item.id),
      name: normalizeText(item.product_name),
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPrice: normalizeNumber(item.unit_price),
      subtotal: normalizeNumber(item.line_total),
    })),
    paymentMethod: mapPaymentMethodToLabel(payment?.payment_method),
    paymentStatus: normalizeText(payment?.status || orderRow.payment_status),
    observation: normalizeText(orderRow.notes),
    statusHistory: buildStatusHistory(orderRow, uiStatus),
    canCancel: false,
    _db: {
      id: orderRow.id,
      status: normalizeText(orderRow.status),
      paymentStatus: normalizeText(orderRow.payment_status),
      paymentId: payment?.id || null,
    },
  });
}

export async function fetchAdminOrdersFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "No pudimos cargar los pedidos desde la base.");
  }

  return (data || []).map(normalizeRemoteOrder);
}

export async function updateRemoteOrderStatus(order, nextStatus) {
  const mapping = UI_TO_DB_STATUS[nextStatus];

  if (!mapping) {
    throw new Error("El estado seleccionado no es valido.");
  }

  const client = requireSupabase();
  const orderId = order?._db?.id || order?.id;

  if (!orderId) {
    throw new Error("No pudimos identificar la orden a actualizar.");
  }

  const previousStatus = normalizeText(order?._db?.status);
  const previousPaymentStatus = normalizeText(order?._db?.paymentStatus);

  const { error: orderError } = await client
    .from("orders")
    .update({
      status: mapping.status,
      payment_status: mapping.payment_status,
    })
    .eq("id", orderId);

  if (orderError) {
    throw new Error(orderError.message || "No pudimos actualizar la orden.");
  }

  if (order?._db?.paymentId) {
    const { error: paymentError } = await client
      .from("payments")
      .update({
        status: mapping.payment_status,
      })
      .eq("id", order._db.paymentId);

    if (paymentError) {
      throw new Error(paymentError.message || "No pudimos actualizar el pago de la orden.");
    }
  }

  if (previousStatus !== mapping.status) {
    await client.from("order_status_history").insert({
      order_id: orderId,
      previous_status: previousStatus || null,
      new_status: mapping.status,
      note: `Cambio manual desde panel admin a ${nextStatus}.`,
    });
  }

  if (previousPaymentStatus !== mapping.payment_status && !order?._db?.paymentId) {
    await client.from("payments").upsert(
      {
        order_id: orderId,
        provider: "manual",
        amount: normalizeNumber(order?.totals?.total),
        status: mapping.payment_status,
        payment_method: normalizeText(order?.paymentMethod).toLowerCase() || "manual",
        external_reference: normalizeText(order?.number),
        payload: {
          source: "admin_manual_update",
          updated_at: new Date().toISOString(),
        },
      },
      { onConflict: "order_id" },
    );
  }

  const orderNumber = normalizeText(order?.number);

  if (orderNumber && nextStatus !== "Pendiente de pago") {
    const emailPayload =
      nextStatus === "Pago confirmado"
        ? {
            templateKey: "payment_approved",
            orderNumber,
          }
        : {
            templateKey: "order_status_changed",
            orderNumber,
            statusLabel: nextStatus,
          };

    await sendOrderEmailNotification(emailPayload).catch((error) => {
      console.error("No pudimos enviar el email de cambio de estado.", error);
    });
  }
}

export async function createCheckoutPayment(payload) {
  try {
    const data = await invokePublicEdgeFunction("create-payment-preference", payload);

    if (!data?.ok) {
      throw new Error(data?.error || "No pudimos generar el pedido.");
    }

    return data;
  } catch (error) {
    if (error instanceof PublicEdgeFunctionError && error.status === 401) {
      throw new Error(
        "La funcion create-payment-preference respondio 401. Revisa que este desplegada como publica (verify_jwt = false) o configura VITE_SUPABASE_ANON_KEY para usar una clave JWT compatible.",
      );
    }

    if (error instanceof PublicEdgeFunctionError && error.body?.error) {
      throw new Error(String(error.body.error) || "No pudimos iniciar el proceso de pago.");
    }

    throw new Error(error.message || "No pudimos iniciar el proceso de pago.");
  }
}

export async function fetchPublicOrderTracking(orderNumber, phone = "") {
  try {
    const data = await invokePublicEdgeFunction("get-order-tracking", {
      orderNumber,
      phone,
    });

    if (!data?.ok || !data?.order) {
      throw new Error(data?.error || "No encontramos el pedido solicitado.");
    }

    return data.order;
  } catch (error) {
    if (error instanceof PublicEdgeFunctionError && error.status === 401) {
      throw new Error(
        "La funcion get-order-tracking respondio 401. Revisa que este desplegada como publica (verify_jwt = false) o configura VITE_SUPABASE_ANON_KEY para usar una clave JWT compatible.",
      );
    }

    if (error instanceof PublicEdgeFunctionError && error.body?.error) {
      throw new Error(String(error.body.error) || "No pudimos consultar el pedido.");
    }

    throw new Error(error.message || "No pudimos consultar el pedido.");
  }
}

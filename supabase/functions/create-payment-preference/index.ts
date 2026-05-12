import { cabecerasCors } from "../_shared/cors.ts";
import { leerSecreto } from "../_shared/env.ts";
import { invocarFuncionInterna } from "../_shared/internalFunctions.ts";
import { crearClienteAdminSupabase } from "../_shared/supabaseAdmin.ts";

const PAYMENT_METHODS = {
  mercadoPago: "mercadopago",
  transferencia: "transferencia",
} as const;

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
    order_id,
    product_id,
    product_name,
    unit_price,
    promo_price,
    quantity,
    line_total,
    variant_name
  ),
  payments (
    id,
    order_id,
    provider,
    preference_id,
    payment_id,
    external_reference,
    amount,
    status,
    payment_method,
    payload,
    approved_at,
    rejected_at,
    created_at,
    updated_at
  )
`;

type CheckoutItemInput = {
  id?: string;
  name?: string;
  quantity?: number;
  basePrice?: number;
  effectivePrice?: number;
  lineTotal?: number;
};

type CheckoutPayload = {
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string | undefined) {
  if (!value) {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function splitFullName(fullName: string) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  const [name = fullName, ...rest] = parts;

  return {
    name,
    surname: rest.join(" "),
  };
}

function mapShippingType(type: string) {
  return type === "pickup" || type === "retiro" ? "pickup" : "delivery";
}

function resolvePublicAppUrl(request: Request) {
  const candidates = [
    Deno.env.get("APP_URL")?.trim() || "",
    request.headers.get("origin")?.trim() || "",
  ].filter(Boolean);

  for (const candidate of candidates) {
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

function buildShippingAddress(delivery: CheckoutPayload["delivery"]) {
  return {
    type: normalizeText(delivery?.type) || "correo",
    address: normalizeText(delivery?.address),
    locality: normalizeText(delivery?.locality),
    postalCode: normalizeText(delivery?.postalCode),
    branch: delivery?.branch ?? null,
  };
}

function buildOrderItems(items: CheckoutItemInput[] = []) {
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

function validateNewCheckoutPayload(payload: CheckoutPayload) {
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

function normalizeExistingOrder(order: Record<string, unknown>) {
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

function buildMercadoPagoItems(order: ReturnType<typeof normalizeExistingOrder>) {
  return order.items.map((item) => ({
    id: item.id || item.name,
    title: item.name,
    quantity: item.quantity,
    currency_id: "ARS",
    unit_price: Number((item.lineTotal / item.quantity).toFixed(2)),
  }));
}

function buildMercadoPagoShipments(order: ReturnType<typeof normalizeExistingOrder>) {
  const shippingAddress = (order.shippingAddress as Record<string, unknown> | null) ?? {};

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

async function createMercadoPagoPreference({
  request,
  order,
  paymentMethod,
}: {
  request: Request;
  order: ReturnType<typeof normalizeExistingOrder>;
  paymentMethod: string;
}) {
  const accessToken = leerSecreto("MERCADOPAGO_ACCESS_TOKEN");
  const appUrl = resolvePublicAppUrl(request);
  const webhookUrl = `${leerSecreto("SUPABASE_URL").replace(/\/$/, "")}/functions/v1/mercadopago-webhook`;
  const { name, surname } = splitFullName(order.customerName);

  const preferencePayload: Record<string, unknown> = {
    items: buildMercadoPagoItems(order),
    payer: {
      name,
      surname: surname || undefined,
      email: order.customerEmail,
      phone: {
        number: order.customerPhone,
      },
      address: {
        zip_code: normalizeText((order.shippingAddress as Record<string, unknown> | null)?.postalCode),
        street_name: normalizeText((order.shippingAddress as Record<string, unknown> | null)?.address),
      },
    },
    shipments: buildMercadoPagoShipments(order),
    notification_url: webhookUrl,
    statement_descriptor: "GRIZZLY",
    external_reference: order.orderNumber,
    additional_info: `Pedido ${order.orderNumber} - ${paymentMethod}`,
    metadata: {
      order_id: order.id,
      order_number: order.orderNumber,
    },
  };

  if (appUrl) {
    preferencePayload.back_urls = {
      success: `${appUrl}/checkout/resultado`,
      failure: `${appUrl}/checkout/resultado`,
      pending: `${appUrl}/checkout/resultado`,
    };
    preferencePayload.auto_return = "approved";
  }

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(preferencePayload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Mercado Pago no pudo generar la preferencia.");
  }

  return data;
}

async function createNewOrder(payload: CheckoutPayload) {
  const supabase = crearClienteAdminSupabase();
  const validated = validateNewCheckoutPayload(payload);

  if (validated.errors.length) {
    throw new Error(validated.errors.join(" "));
  }

  const orderInsert = {
    customer_name: validated.customerName,
    customer_email: validated.customerEmail,
    customer_phone: validated.customerPhone,
    shipping_type: mapShippingType(validated.delivery.type || "delivery"),
    shipping_address_json: validated.delivery,
    notes: validated.observation || null,
    subtotal: validated.totals.subtotal,
    discount: validated.totals.discount,
    shipping_cost: validated.totals.shipping,
    total: validated.totals.total,
    status: "pending",
    payment_status: "pending",
  };

  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .insert(orderInsert)
    .select("id, order_number, customer_name, customer_email, customer_phone, shipping_type, shipping_address_json, notes, subtotal, discount, shipping_cost, total, status, payment_status, created_at, updated_at")
    .single();

  if (orderError || !orderRow) {
    throw new Error(orderError?.message || "No pudimos crear la orden.");
  }

  const itemsToInsert = buildOrderItems(payload.items).map((item) => ({
    ...item,
    order_id: orderRow.id,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderRow.id);
    throw new Error(itemsError.message || "No pudimos guardar los productos del pedido.");
  }

  const paymentPayload = {
    order_id: orderRow.id,
    provider:
      validated.paymentMethod === PAYMENT_METHODS.mercadoPago ? "mercadopago" : "manual",
    preference_id: null,
    payment_id: null,
    external_reference: orderRow.order_number,
    amount: validated.totals.total,
    status: "pending",
    payment_method: validated.paymentMethod,
    payload: {
      source: "web_checkout",
      created_at: new Date().toISOString(),
    },
  };

  const { error: paymentError } = await supabase.from("payments").upsert(paymentPayload, {
    onConflict: "order_id",
  });

  if (paymentError) {
    await supabase.from("orders").delete().eq("id", orderRow.id);
    throw new Error(paymentError.message || "No pudimos crear el registro de pago.");
  }

  const { error: historyError } = await supabase.from("order_status_history").insert({
    order_id: orderRow.id,
    previous_status: null,
    new_status: "pending",
    note: "Pedido creado desde checkout web.",
  });

  if (historyError) {
    console.error("No pudimos registrar el historial inicial del pedido.", historyError);
  }

  return normalizeExistingOrder({
    ...orderRow,
    order_items: itemsToInsert,
    payments: [paymentPayload],
  });
}

async function getExistingOrder(orderNumber: string) {
  const supabase = crearClienteAdminSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "No pudimos leer la orden solicitada.");
  }

  if (!data) {
    throw new Error("No encontramos la orden solicitada para reintentar el pago.");
  }

  return normalizeExistingOrder(data as Record<string, unknown>);
}

async function syncPaymentPreference(orderId: string, preference: Record<string, unknown>) {
  const supabase = crearClienteAdminSupabase();
  const { error } = await supabase
    .from("payments")
    .update({
      provider: "mercadopago",
      preference_id: String(preference.id),
      external_reference: String(preference.external_reference || ""),
      status: "pending",
      payload: preference,
      payment_method: PAYMENT_METHODS.mercadoPago,
    })
    .eq("order_id", orderId);

  if (error) {
    throw new Error(error.message || "No pudimos guardar la preferencia de pago.");
  }
}

async function enviarEmailPedidoCreado(orderNumber: string) {
  await invocarFuncionInterna("send-order-email", {
    templateKey: "order_confirmation",
    orderNumber,
  }).catch((error) => {
    console.error("No pudimos enviar el email de confirmacion de pedido.", error);
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Metodo no permitido." }, 405);
  }

  try {
    const payload = (await request.json()) as CheckoutPayload;
    const requestedOrderNumber = normalizeText(payload.orderNumber).toUpperCase();
    const requestedPaymentMethod =
      normalizeText(payload.paymentMethod).toLowerCase() || PAYMENT_METHODS.mercadoPago;

    const creatingNewOrder = requestedOrderNumber.length === 0;
    let order =
      requestedOrderNumber.length > 0
        ? await getExistingOrder(requestedOrderNumber)
        : await createNewOrder({
            ...payload,
            paymentMethod: requestedPaymentMethod,
          });

    if (creatingNewOrder) {
      await enviarEmailPedidoCreado(order.orderNumber);
    }

    if (order.paymentStatus === "approved") {
      return jsonResponse(
        {
          ok: true,
          checkoutMode: "already-approved",
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: "El pedido ya tiene un pago aprobado.",
        },
        200,
      );
    }

    if (requestedPaymentMethod === PAYMENT_METHODS.transferencia) {
      return jsonResponse(
        {
          ok: true,
          checkoutMode: "manual",
          orderId: order.id,
          orderNumber: order.orderNumber,
          trackingPath: `/seguimiento?pedido=${encodeURIComponent(order.orderNumber)}&telefono=${encodeURIComponent(order.customerPhone)}`,
        },
        200,
      );
    }

    const preference = await createMercadoPagoPreference({
      request,
      order,
      paymentMethod: requestedPaymentMethod,
    });

    await syncPaymentPreference(order.id, preference as Record<string, unknown>);

    return jsonResponse(
      {
        ok: true,
        checkoutMode: "mercadopago",
        orderId: order.id,
        orderNumber: order.orderNumber,
        preferenceId: String((preference as Record<string, unknown>).id),
        initPoint:
          String(
            (preference as Record<string, unknown>).init_point ||
              (preference as Record<string, unknown>).sandbox_init_point ||
              "",
          ) || null,
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

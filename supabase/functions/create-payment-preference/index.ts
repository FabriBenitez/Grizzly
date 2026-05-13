import { cabecerasCors } from "../_shared/cors.ts";
import { leerSecreto } from "../_shared/env.ts";
import { invocarFuncionInterna } from "../_shared/internalFunctions.ts";
import { crearClienteAdminSupabase } from "../_shared/supabaseAdmin.ts";
import {
  PAYMENT_METHODS,
  buildMercadoPagoItems,
  buildMercadoPagoShipments,
  buildOrderItems,
  mapShippingType,
  normalizeExistingOrder,
  normalizeText,
  resolvePublicAppUrl,
  splitFullName,
  validateNewCheckoutPayload,
  type CheckoutPayload,
} from "../../../src/shared/payments/checkout.ts";

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

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: cabecerasCors,
  });
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
  const appUrl = resolvePublicAppUrl({
    appUrl: Deno.env.get("APP_URL"),
    requestOrigin: request.headers.get("origin"),
  });
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

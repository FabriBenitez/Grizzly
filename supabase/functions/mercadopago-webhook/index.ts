import { cabecerasCors } from "../_shared/cors.ts";
import { crearClienteAdminSupabase } from "../_shared/supabaseAdmin.ts";

const PAYMENT_STATUS_MAP = {
  approved: "approved",
  authorized: "pending",
  in_process: "pending",
  pending: "pending",
  rejected: "rejected",
  cancelled: "rejected",
  refunded: "refunded",
  charged_back: "rejected",
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

function normalizeTimestamp(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function parseSignatureHeader(signatureHeader: string | null) {
  if (!signatureHeader) {
    return { ts: "", v1: "" };
  }

  return signatureHeader.split(",").reduce(
    (acc, part) => {
      const [key, rawValue] = part.split("=");
      const value = normalizeText(rawValue);

      if (normalizeText(key) === "ts") {
        acc.ts = value;
      }

      if (normalizeText(key) === "v1") {
        acc.v1 = value;
      }

      return acc;
    },
    { ts: "", v1: "" },
  );
}

async function createHmacSha256(secret: string, manifest: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));

  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function validateWebhookSignature(request: Request, notificationId: string) {
  const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET")?.trim();

  if (!secret) {
    return true;
  }

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  if (!signatureHeader || !requestId) {
    return false;
  }

  const { ts, v1 } = parseSignatureHeader(signatureHeader);

  if (!ts || !v1) {
    return false;
  }

  const manifest = `id:${notificationId};request-id:${requestId};ts:${ts};`;
  const generated = await createHmacSha256(secret, manifest);

  return generated === v1;
}

function resolveInternalPaymentStatus(mercadoPagoStatus: string) {
  return PAYMENT_STATUS_MAP[mercadoPagoStatus as keyof typeof PAYMENT_STATUS_MAP] || "pending";
}

function resolveOrderStatus(currentOrderStatus: string, internalPaymentStatus: string) {
  if (internalPaymentStatus === "approved") {
    return currentOrderStatus === "cancelled" ? "cancelled" : "paid";
  }

  return currentOrderStatus || "pending";
}

async function fetchMercadoPagoPayment(paymentId: string) {
  const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")?.trim();

  if (!accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN para consultar pagos.");
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "No pudimos consultar el pago en Mercado Pago.");
  }

  return data as Record<string, unknown>;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  const url = new URL(request.url);

  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      action?: string;
      topic?: string;
      data?: { id?: string | number };
    };

    const notificationType = normalizeText(body.type || body.topic);
    const notificationId =
      normalizeText(url.searchParams.get("data.id")) ||
      normalizeText(body.data?.id ? String(body.data.id) : "");

    if (notificationType && notificationType !== "payment") {
      return jsonResponse({
        ok: true,
        ignored: true,
        reason: `Notificacion ignorada para topic ${notificationType}.`,
      });
    }

    if (!notificationId) {
      return jsonResponse({ ok: false, error: "La notificacion no incluye data.id." }, 400);
    }

    const signatureIsValid = await validateWebhookSignature(request, notificationId);

    if (!signatureIsValid) {
      return jsonResponse({ ok: false, error: "Firma invalida." }, 401);
    }

    const mercadoPagoPayment = await fetchMercadoPagoPayment(notificationId);
    const internalPaymentStatus = resolveInternalPaymentStatus(
      normalizeText(mercadoPagoPayment.status),
    );
    const externalReference = normalizeText(mercadoPagoPayment.external_reference);

    if (!externalReference) {
      return jsonResponse(
        {
          ok: false,
          error: "El pago no incluye external_reference para vincular la orden.",
        },
        400,
      );
    }

    const supabase = crearClienteAdminSupabase();
    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, status, payment_status")
      .eq("order_number", externalReference)
      .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message || "No pudimos consultar la orden vinculada.");
    }

    if (!orderRow) {
      return jsonResponse(
        {
          ok: false,
          error: "No encontramos la orden vinculada a este pago.",
        },
        404,
      );
    }

    const { data: paymentRow, error: paymentError } = await supabase
      .from("payments")
      .select("id, status, order_id")
      .eq("order_id", orderRow.id)
      .maybeSingle();

    if (paymentError) {
      throw new Error(paymentError.message || "No pudimos consultar el registro de pago.");
    }

    if (!paymentRow) {
      return jsonResponse(
        {
          ok: false,
          error: "No existe el registro de pago para esta orden.",
        },
        404,
      );
    }

    const nextOrderStatus = resolveOrderStatus(normalizeText(orderRow.status), internalPaymentStatus);

    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        provider: "mercadopago",
        payment_id: String(mercadoPagoPayment.id),
        external_reference: externalReference,
        amount: Number(mercadoPagoPayment.transaction_amount || 0),
        status: internalPaymentStatus,
        payment_method:
          normalizeText(mercadoPagoPayment.payment_method_id) ||
          normalizeText(mercadoPagoPayment.payment_type_id) ||
          "mercadopago",
        approved_at: normalizeTimestamp(mercadoPagoPayment.date_approved),
        rejected_at:
          internalPaymentStatus === "rejected"
            ? normalizeTimestamp(mercadoPagoPayment.date_last_updated)
            : null,
        payload: mercadoPagoPayment,
      })
      .eq("id", paymentRow.id);

    if (updatePaymentError) {
      throw new Error(updatePaymentError.message || "No pudimos actualizar el pago.");
    }

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        payment_status: internalPaymentStatus,
        status: nextOrderStatus,
      })
      .eq("id", orderRow.id);

    if (updateOrderError) {
      throw new Error(updateOrderError.message || "No pudimos sincronizar la orden.");
    }

    if (normalizeText(orderRow.status) !== nextOrderStatus) {
      await supabase
        .from("order_status_history")
        .insert({
          order_id: orderRow.id,
          previous_status: orderRow.status,
          new_status: nextOrderStatus,
          note: `Actualizacion automatica desde webhook Mercado Pago (${normalizeText(body.action) || "payment.updated"}).`,
        })
        .catch(() => undefined);
    }

    return jsonResponse({
      ok: true,
      orderNumber: orderRow.order_number,
      paymentStatus: internalPaymentStatus,
    });
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

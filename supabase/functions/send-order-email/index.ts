import { cabecerasCors } from "../_shared/cors.ts";
import { leerSecreto } from "../_shared/env.ts";
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
    provider,
    preference_id,
    payment_id,
    external_reference,
    amount,
    status,
    payment_method,
    approved_at,
    rejected_at,
    created_at,
    updated_at
  )
`;

const DB_STATUS_LABELS = {
  pending: "Pendiente de pago",
  paid: "Pago confirmado",
  packing: "En preparacion",
  shipped: "Despachado",
  delivered: "Entregado",
  cancelled: "Cancelado",
} as const;

type TemplateKey = "order_confirmation" | "payment_approved" | "order_status_changed";

type SendOrderEmailPayload = {
  templateKey?: TemplateKey;
  orderId?: string;
  orderNumber?: string;
  statusLabel?: string;
  force?: boolean;
  to?: string;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function resolveStatusLabel(order: Record<string, unknown>, fallback = "") {
  const dbStatus = normalizeText(order.status);
  return fallback || DB_STATUS_LABELS[dbStatus as keyof typeof DB_STATUS_LABELS] || "Actualizado";
}

function mapPaymentMethodLabel(method: string) {
  const normalized = method.toLowerCase();

  if (normalized === "mercadopago") {
    return "Mercado Pago";
  }

  if (normalized === "transferencia") {
    return "Transferencia";
  }

  return method || "Sin definir";
}

function buildTrackingUrl(orderNumber: string, phone: string) {
  const appUrl = (Deno.env.get("APP_URL")?.trim() || "http://localhost:5173").replace(/\/$/, "");
  return `${appUrl}/seguimiento?pedido=${encodeURIComponent(orderNumber)}&telefono=${encodeURIComponent(phone)}`;
}

async function getOrderForEmail(payload: SendOrderEmailPayload) {
  const supabase = crearClienteAdminSupabase();
  let query = supabase.from("orders").select(ORDER_SELECT);

  if (payload.orderId) {
    query = query.eq("id", payload.orderId);
  } else if (payload.orderNumber) {
    query = query.eq("order_number", payload.orderNumber);
  } else {
    throw new Error("Falta orderId u orderNumber para enviar el email.");
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message || "No pudimos cargar la orden para el email.");
  }

  if (!data) {
    throw new Error("No encontramos la orden para enviar el email.");
  }

  return data as Record<string, unknown>;
}

function buildResolvedTemplateKey(order: Record<string, unknown>, payload: SendOrderEmailPayload) {
  if (payload.templateKey === "order_confirmation") {
    return "order_confirmation";
  }

  if (payload.templateKey === "payment_approved") {
    return "payment_approved";
  }

  if (payload.templateKey === "order_status_changed") {
    const dbStatus = normalizeText(order.status) || "updated";
    return `order_status_${dbStatus}`;
  }

  throw new Error("Template de email no soportado.");
}

function buildEmailSubject(order: Record<string, unknown>, payload: SendOrderEmailPayload) {
  const orderNumber = normalizeText(order.order_number);
  const statusLabel = resolveStatusLabel(order, normalizeText(payload.statusLabel));

  if (payload.templateKey === "order_confirmation") {
    return `Recibimos tu pedido ${orderNumber}`;
  }

  if (payload.templateKey === "payment_approved") {
    return `Pago aprobado para tu pedido ${orderNumber}`;
  }

  return `Tu pedido ${orderNumber} ahora esta ${statusLabel}`;
}

function buildOrderItemsHtml(order: Record<string, unknown>) {
  const items = Array.isArray(order.order_items) ? order.order_items : [];

  return items
    .map((item) => {
      const productName = escapeHtml(normalizeText((item as Record<string, unknown>).product_name));
      const quantity = Math.max(1, Number((item as Record<string, unknown>).quantity) || 1);
      const lineTotal = formatCurrency(normalizeNumber((item as Record<string, unknown>).line_total));

      return `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #efe3d6;">${productName}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #efe3d6; text-align: center;">x${quantity}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #efe3d6; text-align: right;">${lineTotal}</td>
        </tr>
      `;
    })
    .join("");
}

function buildEmailBody(order: Record<string, unknown>, payload: SendOrderEmailPayload) {
  const orderNumber = normalizeText(order.order_number);
  const customerName = escapeHtml(normalizeText(order.customer_name));
  const phone = normalizeText(order.customer_phone);
  const statusLabel = resolveStatusLabel(order, normalizeText(payload.statusLabel));
  const payment = getPrimaryPayment(order.payments) as Record<string, unknown> | null;
  const paymentMethodRaw =
    normalizeText(payment?.payment_method) ||
    (normalizeText(order.payment_status) === "approved" ? "mercadopago" : "");
  const paymentMethod = mapPaymentMethodLabel(paymentMethodRaw);
  const trackingUrl = buildTrackingUrl(orderNumber, phone);
  const heading =
    payload.templateKey === "order_confirmation"
      ? "Tu pedido ya fue recibido"
      : payload.templateKey === "payment_approved"
        ? "Tu pago fue aprobado"
        : `Actualizamos el estado de tu pedido: ${statusLabel}`;
  const intro =
    payload.templateKey === "order_confirmation"
      ? "Ya registramos tu compra y dejamos listo el seguimiento."
      : payload.templateKey === "payment_approved"
        ? "Mercado Pago nos confirmo la acreditacion y tu pedido ya entra en la siguiente etapa."
        : "Te avisamos para que tengas visibilidad del avance sin necesidad de escribirnos.";

  const html = `
    <div style="background:#f6f1ea;padding:32px 16px;font-family:Arial,sans-serif;color:#2d241f;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #eaded1;border-radius:24px;overflow:hidden;">
        <div style="padding:28px 28px 22px;background:linear-gradient(180deg,#fffdfb,#f7efe7);border-bottom:1px solid #efe2d6;">
          <p style="margin:0 0 8px;color:#9a6347;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Grizzly Suplementos</p>
          <h1 style="margin:0 0 8px;font-size:28px;line-height:1.1;">${escapeHtml(heading)}</h1>
          <p style="margin:0;color:#6d5f57;font-size:15px;line-height:1.6;">Hola ${customerName}, ${escapeHtml(intro)}</p>
        </div>

        <div style="padding:28px;">
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:24px;">
            <div style="padding:14px 16px;border:1px solid #eee2d7;border-radius:18px;background:#fcf9f5;">
              <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9a6347;">Pedido</span>
              <strong style="display:block;margin-top:6px;font-size:18px;">${escapeHtml(orderNumber)}</strong>
            </div>
            <div style="padding:14px 16px;border:1px solid #eee2d7;border-radius:18px;background:#fcf9f5;">
              <span style="display:block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9a6347;">Total</span>
              <strong style="display:block;margin-top:6px;font-size:18px;">${formatCurrency(normalizeNumber(order.total))}</strong>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
            <thead>
              <tr>
                <th style="text-align:left;padding-bottom:10px;color:#7f6f66;font-size:12px;">Producto</th>
                <th style="text-align:center;padding-bottom:10px;color:#7f6f66;font-size:12px;">Cant.</th>
                <th style="text-align:right;padding-bottom:10px;color:#7f6f66;font-size:12px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${buildOrderItemsHtml(order)}
            </tbody>
          </table>

          <div style="padding:16px;border-radius:18px;background:#fbf6f1;border:1px solid #efe3d6;">
            <p style="margin:0 0 6px;"><strong>Pago:</strong> ${escapeHtml(paymentMethod)}</p>
            <p style="margin:0 0 6px;"><strong>Estado actual:</strong> ${escapeHtml(statusLabel)}</p>
            <p style="margin:0;"><strong>Seguimiento:</strong> <a href="${trackingUrl}" style="color:#8b5a2b;">Ver pedido</a></p>
          </div>
        </div>
      </div>
    </div>
  `;

  const text =
    `${heading}\n\n` +
    `Pedido: ${orderNumber}\n` +
    `Cliente: ${normalizeText(order.customer_name)}\n` +
    `Total: ${formatCurrency(normalizeNumber(order.total))}\n` +
    `Estado: ${statusLabel}\n` +
    `Seguimiento: ${trackingUrl}`;

  return { html, text };
}

async function findExistingSentEmail(orderId: string, templateKey: string) {
  const supabase = crearClienteAdminSupabase();
  const { data } = await supabase
    .from("email_logs")
    .select("id")
    .eq("order_id", orderId)
    .eq("template_key", templateKey)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

async function createEmailLog(input: {
  orderId: string;
  paymentId: string | null;
  templateKey: string;
  toEmail: string;
  subject: string;
  payload: Record<string, unknown>;
}) {
  const supabase = crearClienteAdminSupabase();
  const { data, error } = await supabase
    .from("email_logs")
    .insert({
      order_id: input.orderId,
      payment_id: input.paymentId,
      template_key: input.templateKey,
      to_email: input.toEmail,
      subject: input.subject,
      status: "pending",
      payload: input.payload,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No pudimos crear el log del email.");
  }

  return String(data.id);
}

async function updateEmailLog(logId: string, patch: Record<string, unknown>) {
  const supabase = crearClienteAdminSupabase();
  await supabase.from("email_logs").update(patch).eq("id", logId);
}

async function sendWithResend(input: {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = leerSecreto("RESEND_API_KEY");
  const fromEmail = leerSecreto("RESEND_FROM_EMAIL");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.toEmail],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Resend no pudo enviar el email.");
  }

  return data as Record<string, unknown>;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: cabecerasCors });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Metodo no permitido." }, 405);
  }

  try {
    const payload = (await request.json()) as SendOrderEmailPayload;
    const order = await getOrderForEmail(payload);
    const resolvedTemplateKey = buildResolvedTemplateKey(order, payload);
    const subject = buildEmailSubject(order, payload);
    const toEmail = normalizeText(payload.to || order.customer_email).toLowerCase();

    if (!toEmail) {
      throw new Error("La orden no tiene un email valido para enviar notificaciones.");
    }

    if (!payload.force) {
      const alreadySent = await findExistingSentEmail(String(order.id), resolvedTemplateKey);

      if (alreadySent) {
        return jsonResponse({
          ok: true,
          skipped: true,
          reason: "El email ya habia sido enviado previamente.",
          templateKey: resolvedTemplateKey,
        });
      }
    }

    const { html, text } = buildEmailBody(order, payload);
    const payment = getPrimaryPayment(order.payments) as Record<string, unknown> | null;
    const logId = await createEmailLog({
      orderId: String(order.id),
      paymentId: payment?.id ? String(payment.id) : null,
      templateKey: resolvedTemplateKey,
      toEmail,
      subject,
      payload: {
        requested_template: payload.templateKey,
        resolved_template: resolvedTemplateKey,
        status_label: normalizeText(payload.statusLabel),
      },
    });

    try {
      const resendResponse = await sendWithResend({
        toEmail,
        subject,
        html,
        text,
      });

      await updateEmailLog(logId, {
        status: "sent",
        provider_message_id: normalizeText(resendResponse.id),
        payload: {
          requested_template: payload.templateKey,
          resolved_template: resolvedTemplateKey,
          resend: resendResponse,
        },
        sent_at: new Date().toISOString(),
      });

      return jsonResponse({
        ok: true,
        templateKey: resolvedTemplateKey,
        messageId: normalizeText(resendResponse.id),
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Error desconocido.";

      await updateEmailLog(logId, {
        status: "failed",
        error_message: message,
        payload: {
          requested_template: payload.templateKey,
          resolved_template: resolvedTemplateKey,
          failed_at: new Date().toISOString(),
        },
      });

      throw sendError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido.";
    return jsonResponse({ ok: false, error: message }, 500);
  }
});

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Boxes,
  CalendarDays,
  Download,
  FilterX,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { ORDER_STATUSES } from "../../data/constants";
import { products } from "../../data/products";
import { formatCurrency } from "../../utils/currency";
import { CONFIRMED_ORDER_STATUSES, getOrdersSource } from "../../utils/admin";
import { getOrders } from "../../utils/orders";

const REPORT_STATUS_COLORS = {
  "Pendiente de pago": "#d1a35f",
  "Pago confirmado": "#8f6a56",
  "En preparacion": "#c28c55",
  Despachado: "#8b7a6e",
  Entregado: "#6d5b53",
  Cancelado: "#be6d63",
  Vencido: "#a74d44",
};

const REPORT_PAYMENT_LABELS = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  link: "Link de pago",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
};

const REPORT_PIE_COLORS = ["#7a5648", "#a86b58", "#c28c55", "#d5b28d", "#8f7a71"];

function percent(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function parseReportDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

function shortenLabel(value, max = 28) {
  if (!value) {
    return "";
  }

  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function formatCompactMoney(value) {
  return new Intl.NumberFormat("es-AR", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(parseReportDate(value));
}

function formatShortDateTime(value) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parseReportDate(value));
}

function toInputDate(value) {
  if (!value) {
    return "";
  }

  const date = parseReportDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateStart(value) {
  const date = parseReportDate(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildDateEnd(value) {
  const date = parseReportDate(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function normalizePaymentLabel(method) {
  return REPORT_PAYMENT_LABELS[String(method || "").toLowerCase()] || method || "Sin definir";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildScenarioStatusHistory(status, createdAt) {
  const baseDate = new Date(createdAt);
  const buildTimestamp = (minutes) => new Date(baseDate.getTime() + minutes * 60000).toISOString();

  if (status === "Cancelado" || status === "Vencido") {
    return [
      { status: "Pendiente de pago", timestamp: createdAt },
      { status, timestamp: buildTimestamp(90) },
    ];
  }

  const flow = ["Pendiente de pago", "Pago confirmado", "En preparacion", "Despachado", "Entregado"];
  const endIndex = flow.indexOf(status);

  return flow.slice(0, endIndex + 1).map((step, index) => ({
    status: step,
    timestamp: buildTimestamp(index * 95),
  }));
}

function buildAdvancedReportOrders(seedOrders, catalog) {
  if (seedOrders.length > 18) {
    return seedOrders;
  }

  const customerNames = [
    ["Lucia Mendez", "1124558899", "lucia.mendez@email.com", "Olavarria"],
    ["Matias Ortiz", "2236987411", "matias.ortiz@email.com", "La Plata"],
    ["Camila Vera", "2284987365", "camila.vera@email.com", "Azul"],
    ["Diego Ferreyra", "1145879632", "diego.ferreyra@email.com", "CABA"],
    ["Julieta Rios", "2217412589", "julieta.rios@email.com", "Mar del Plata"],
    ["Bruno Salas", "2235547896", "bruno.salas@email.com", "Tandil"],
    ["Paula Cabral", "1163358794", "paula.cabral@email.com", "Bahia Blanca"],
    ["Valentin Sosa", "2231124578", "valentin.sosa@email.com", "Necochea"],
  ];

  const activeProducts = catalog.filter((product) => product.active !== false);
  const statusPattern = [
    "Entregado",
    "Pago confirmado",
    "Entregado",
    "Despachado",
    "Entregado",
    "En preparacion",
    "Pago confirmado",
    "Pendiente de pago",
    "Cancelado",
    "Vencido",
  ];
  const paymentPattern = ["transferencia", "link", "efectivo"];
  const generatedOrders = [];
  const now = new Date();
  let sequence = 7100;

  for (let dayIndex = 56; dayIndex >= 0; dayIndex -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - dayIndex);

    const dailyCount = 3 + (dayIndex % 4) + ([5, 6].includes(day.getDay()) ? 2 : 0);

    for (let slot = 0; slot < dailyCount; slot += 1) {
      const customer = customerNames[(dayIndex + slot) % customerNames.length];
      const primary = activeProducts[(dayIndex + slot * 2) % activeProducts.length];
      const secondary = activeProducts[(dayIndex + slot * 3 + 4) % activeProducts.length];
      const includeSecondItem = slot % 2 === 0;
      const primaryQty = 1 + ((dayIndex + slot) % 2);
      const secondaryQty = includeSecondItem ? 1 + (slot % 2) : 0;
      const primaryUnitPrice = primary.promoPrice || primary.price;
      const secondaryUnitPrice = secondary.promoPrice || secondary.price;
      const items = [
        {
          id: primary.id,
          name: primary.name,
          quantity: primaryQty,
          unitPrice: primaryUnitPrice,
          subtotal: primaryQty * primaryUnitPrice,
        },
      ];

      if (includeSecondItem) {
        items.push({
          id: secondary.id,
          name: secondary.name,
          quantity: secondaryQty,
          unitPrice: secondaryUnitPrice,
          subtotal: secondaryQty * secondaryUnitPrice,
        });
      }

      const subtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
      const discount = Math.round(subtotal * (0.08 + ((dayIndex + slot) % 4) * 0.03));
      const deliveryType = slot % 3 === 0 ? "retiro" : "envio";
      const shipping = deliveryType === "envio" ? 3200 + ((dayIndex + slot) % 3) * 650 : 0;
      const status = statusPattern[(dayIndex + slot) % statusPattern.length];
      const paymentMethod = paymentPattern[(dayIndex + slot) % paymentPattern.length];
      const createdAt = new Date(day);
      createdAt.setHours(9 + ((slot * 3) % 9), 15 + ((slot * 11) % 40), 0, 0);

      generatedOrders.push({
        number: String(sequence).padStart(6, "0"),
        status,
        createdAt: createdAt.toISOString(),
        customer: {
          name: customer[0],
          phone: customer[1],
          email: customer[2],
        },
        items,
        totals: {
          subtotal,
          discount,
          shipping,
          total: subtotal - discount + shipping,
        },
        delivery: {
          type: deliveryType,
          address: deliveryType === "envio" ? `Calle ${120 + slot} ${800 + dayIndex}` : "",
          locality: customer[3],
          postalCode: deliveryType === "envio" ? `7${String(100 + dayIndex).slice(-3)}` : "",
          pickupPerson: deliveryType === "retiro" ? customer[0] : "",
          pickupWindow: deliveryType === "retiro" ? "17 a 20 hs" : "",
        },
        paymentMethod,
        observation:
          status === "Pendiente de pago"
            ? "Recordar seguimiento de cobro."
            : status === "Cancelado" || status === "Vencido"
              ? "Operacion cerrada sin entrega."
              : "Pedido operativo dentro del flujo comercial.",
        statusHistory: buildScenarioStatusHistory(status, createdAt.toISOString()),
      });

      sequence += 1;
    }
  }

  return generatedOrders;
}

function buildSalesTrend(orders) {
  const bucket = new Map();

  orders.forEach((order) => {
    const key = toInputDate(order.createdAt);
    const current = bucket.get(key) || {
      key,
      label: formatShortDate(order.createdAt),
      orders: 0,
      revenue: 0,
    };

    current.orders += 1;
    if (CONFIRMED_ORDER_STATUSES.includes(order.status)) {
      current.revenue += order.totals?.total || 0;
    }

    bucket.set(key, current);
  });

  return [...bucket.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function buildStatusDistribution(orders) {
  return ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
    fill: REPORT_STATUS_COLORS[status],
  }));
}

function buildTopProducts(orders) {
  const bucket = new Map();

  orders
    .filter((order) => CONFIRMED_ORDER_STATUSES.includes(order.status))
    .forEach((order) => {
      (order.items || []).forEach((item) => {
        const current = bucket.get(item.id) || {
          id: item.id,
          name: item.name,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += item.quantity || 0;
        current.revenue += item.subtotal || 0;
        bucket.set(item.id, current);
      });
    });

  return [...bucket.values()].sort((a, b) => b.revenue - a.revenue);
}

function buildCategoryPerformance(orders, productIndex) {
  const bucket = new Map();

  orders
    .filter((order) => CONFIRMED_ORDER_STATUSES.includes(order.status))
    .forEach((order) => {
      (order.items || []).forEach((item) => {
        const product = productIndex.get(item.id);
        const category = product?.category || "Sin categoria";
        const current = bucket.get(category) || {
          category,
          quantity: 0,
          revenue: 0,
        };

        current.quantity += item.quantity || 0;
        current.revenue += item.subtotal || 0;
        bucket.set(category, current);
      });
    });

  return [...bucket.values()].sort((a, b) => b.revenue - a.revenue);
}

function buildPaymentMix(orders) {
  const bucket = new Map();

  orders
    .filter((order) => CONFIRMED_ORDER_STATUSES.includes(order.status))
    .forEach((order) => {
      const label = normalizePaymentLabel(order.paymentMethod);
      const current = bucket.get(label) || {
        method: label,
        orders: 0,
        revenue: 0,
      };

      current.orders += 1;
      current.revenue += order.totals?.total || 0;
      bucket.set(label, current);
    });

  return [...bucket.values()].sort((a, b) => b.revenue - a.revenue);
}

function buildFunnelData(orders) {
  return [
    {
      label: "Pendiente de pago",
      value: orders.filter((order) => order.status === "Pendiente de pago").length,
      helper: "Pedidos esperando cobro",
    },
    {
      label: "Pago confirmado",
      value: orders.filter((order) =>
        ["Pago confirmado", "En preparacion", "Despachado", "Entregado"].includes(order.status),
      ).length,
      helper: "Pedidos que ya confirmaron cobro",
    },
    {
      label: "En preparacion",
      value: orders.filter((order) =>
        ["En preparacion", "Despachado", "Entregado"].includes(order.status),
      ).length,
      helper: "Pedidos procesados internamente",
    },
    {
      label: "Despachado",
      value: orders.filter((order) => ["Despachado", "Entregado"].includes(order.status)).length,
      helper: "Pedidos que ya salieron",
    },
    {
      label: "Entregado",
      value: orders.filter((order) => order.status === "Entregado").length,
      helper: "Operaciones finalizadas",
    },
  ];
}

function buildReportDocument({
  effectiveFrom,
  effectiveTo,
  generatedAt,
  summary,
  insightCards,
  statusDistribution,
  funnelData,
  topProducts,
  categoryPerformance,
  paymentMix,
  useDemoData,
}) {
  const totalOrders = statusDistribution.reduce((acc, item) => acc + item.count, 0);
  const maxStatusCount = Math.max(...statusDistribution.map((item) => item.count), 1);
  const maxProductRevenue = Math.max(...topProducts.map((item) => item.revenue), 1);
  const maxCategoryRevenue = Math.max(...categoryPerformance.map((item) => item.revenue), 1);
  const maxPaymentRevenue = Math.max(...paymentMix.map((item) => item.revenue), 1);

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Reporte comercial Admin Grizzly</title>
      <style>
        @page {
          size: A4;
          margin: 14mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: Inter, Arial, sans-serif;
          color: #2a1d18;
          background: #fbf7f3;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .report {
          display: grid;
          gap: 16px;
        }
        .hero {
          padding: 22px 24px;
          border-radius: 18px;
          background: linear-gradient(180deg, #fffdfb, #f5ece6);
          border: 1px solid #e2d5cc;
        }
        .hero-top {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }
        .brand {
          display: grid;
          gap: 6px;
        }
        .brand span {
          color: #9b5948;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 11px;
          font-weight: 800;
        }
        .brand h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1;
        }
        .brand p {
          margin: 0;
          color: #6d615b;
          line-height: 1.55;
          max-width: 520px;
        }
        .meta {
          padding: 14px 16px;
          min-width: 260px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid #ebdfd6;
        }
        .meta strong,
        .meta span {
          display: block;
        }
        .meta strong {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8b6a5d;
          margin-bottom: 6px;
        }
        .meta span {
          line-height: 1.5;
          color: #473934;
        }
        .kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }
        .kpi {
          padding: 14px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #ece0d8;
        }
        .kpi small {
          display: block;
          color: #8d7c73;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .kpi strong {
          display: block;
          font-size: 23px;
          line-height: 1.05;
        }
        .kpi span {
          display: block;
          margin-top: 6px;
          color: #6e625c;
          font-size: 12px;
          line-height: 1.45;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .card {
          padding: 16px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid #e9ddd5;
        }
        .card h2 {
          margin: 0 0 12px;
          font-size: 16px;
        }
        .card p {
          margin: 0;
          color: #6c605b;
          line-height: 1.5;
        }
        .insight {
          display: grid;
          gap: 8px;
        }
        .insight small {
          color: #a35847;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-weight: 800;
        }
        .insight strong {
          font-size: 18px;
          line-height: 1.25;
        }
        .funnel {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }
        .funnel-step {
          padding: 14px;
          border-radius: 14px;
          background: #f9f2ed;
          border: 1px solid #eadcd2;
        }
        .funnel-step b {
          display: block;
          font-size: 24px;
          line-height: 1;
          margin-bottom: 6px;
        }
        .funnel-step span {
          display: block;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .funnel-step small {
          color: #756a64;
          line-height: 1.4;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th,
        td {
          padding: 10px 0;
          border-bottom: 1px solid #ece0d8;
          text-align: left;
          vertical-align: top;
        }
        th {
          color: #8d7c73;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        td strong {
          display: block;
        }
        .bar-track {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: #f0e5df;
          overflow: hidden;
          margin-top: 6px;
        }
        .bar-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #7a5648, #c28c55);
        }
        .note {
          padding: 14px 16px;
          border-radius: 14px;
          background: #fff8f2;
          border: 1px solid #ead9cc;
          color: #6a5d56;
          line-height: 1.55;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <main class="report">
        <section class="hero">
          <div class="hero-top">
            <div class="brand">
              <span>Admin Grizzly</span>
              <h1>Reporte comercial ejecutivo</h1>
              <p>
                Documento preparado para seguimiento comercial, decisiones operativas y presentacion
                interna del desempeno del ecommerce de suplementos.
              </p>
            </div>
            <div class="meta">
              <strong>Periodo analizado</strong>
              <span>${escapeHtml(formatShortDate(effectiveFrom))} al ${escapeHtml(formatShortDate(effectiveTo))}</span>
              <strong style="margin-top: 12px;">Generado</strong>
              <span>${escapeHtml(formatShortDateTime(generatedAt))}</span>
              <strong style="margin-top: 12px;">Fuente</strong>
              <span>${useDemoData ? "Escenario demo enriquecido para presentacion comercial" : "Datos activos del panel administrativo"}</span>
            </div>
          </div>
          <div class="kpis">
            <article class="kpi">
              <small>Facturacion confirmada</small>
              <strong>${escapeHtml(formatCurrency(summary.revenue))}</strong>
              <span>${summary.confirmedOrders} pedidos ya cobran valor comercial confirmado.</span>
            </article>
            <article class="kpi">
              <small>Ticket promedio</small>
              <strong>${escapeHtml(formatCurrency(summary.averageTicket))}</strong>
              <span>Promedio de venta sobre operaciones cobradas o entregadas.</span>
            </article>
            <article class="kpi">
              <small>Unidades vendidas</small>
              <strong>${escapeHtml(String(summary.unitsSold))}</strong>
              <span>${summary.productsWithSales} productos tuvieron rotacion en el periodo.</span>
            </article>
            <article class="kpi">
              <small>Clientes activos</small>
              <strong>${escapeHtml(String(summary.activeCustomers))}</strong>
              <span>Base que opero dentro del rango seleccionado.</span>
            </article>
            <article class="kpi">
              <small>Pedidos en riesgo</small>
              <strong>${escapeHtml(String(summary.riskOrders))}</strong>
              <span>Incluye pendientes de pago, cancelados y vencidos.</span>
            </article>
            <article class="kpi">
              <small>Descuento comercial</small>
              <strong>${escapeHtml(formatCurrency(summary.discounts))}</strong>
              <span>Inversion comercial aplicada para cerrar ventas.</span>
            </article>
          </div>
        </section>

        <section class="grid-3">
          ${insightCards
            .map(
              (item) => `<article class="card insight">
                <small>${escapeHtml(item.label)}</small>
                <strong>${escapeHtml(item.value)}</strong>
                <p>${escapeHtml(item.helper)}</p>
              </article>`,
            )
            .join("")}
        </section>

        <section class="card">
          <h2>Embudo operativo</h2>
          <div class="funnel">
            ${funnelData
              .map(
                (item) => `<div class="funnel-step">
                  <b>${escapeHtml(String(item.value))}</b>
                  <span>${escapeHtml(item.label)}</span>
                  <small>${escapeHtml(item.helper)}</small>
                </div>`,
              )
              .join("")}
          </div>
        </section>

        <section class="grid-3">
          <article class="card">
            <h2>Distribucion de pedidos</h2>
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Cantidad</th>
                  <th>Participacion</th>
                </tr>
              </thead>
              <tbody>
                ${statusDistribution
                  .map(
                    (item) => `<tr>
                      <td>
                        <strong>${escapeHtml(item.status)}</strong>
                        <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(
                          8,
                          (item.count / maxStatusCount) * 100,
                        )}%; background: ${item.fill};"></div></div>
                      </td>
                      <td>${escapeHtml(String(item.count))}</td>
                      <td>${escapeHtml(String(percent(item.count, totalOrders)))}%</td>
                    </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </article>

          <article class="card">
            <h2>Mix de cobros</h2>
            <table>
              <thead>
                <tr>
                  <th>Medio</th>
                  <th>Pedidos</th>
                  <th>Facturacion</th>
                </tr>
              </thead>
              <tbody>
                ${paymentMix
                  .map(
                    (item) => `<tr>
                      <td>
                        <strong>${escapeHtml(item.method)}</strong>
                        <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(
                          8,
                          (item.revenue / maxPaymentRevenue) * 100,
                        )}%;"></div></div>
                      </td>
                      <td>${escapeHtml(String(item.orders))}</td>
                      <td>${escapeHtml(formatCurrency(item.revenue))}</td>
                    </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </article>

          <article class="card">
            <h2>Categorias con mayor movimiento</h2>
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Unidades</th>
                  <th>Facturacion</th>
                </tr>
              </thead>
              <tbody>
                ${categoryPerformance
                  .slice(0, 6)
                  .map(
                    (item) => `<tr>
                      <td>
                        <strong>${escapeHtml(item.category)}</strong>
                        <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(
                          8,
                          (item.revenue / maxCategoryRevenue) * 100,
                        )}%;"></div></div>
                      </td>
                      <td>${escapeHtml(String(item.quantity))}</td>
                      <td>${escapeHtml(formatCurrency(item.revenue))}</td>
                    </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>
          </article>
        </section>

        <section class="card">
          <h2>Top productos del periodo</h2>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Unidades</th>
                <th>Facturacion</th>
              </tr>
            </thead>
            <tbody>
              ${topProducts
                .slice(0, 10)
                .map(
                  (item) => `<tr>
                    <td>
                      <strong>${escapeHtml(item.name)}</strong>
                      <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(
                        8,
                        (item.revenue / maxProductRevenue) * 100,
                      )}%;"></div></div>
                    </td>
                    <td>${escapeHtml(String(item.quantity))}</td>
                    <td>${escapeHtml(formatCurrency(item.revenue))}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </section>

        <section class="note">
          Este documento resume el desempeno comercial del periodo filtrado y esta pensado para
          presentacion operativa, seguimiento interno y lectura ejecutiva de ventas, conversion,
          productos, categorias y medios de cobro.
        </section>
      </main>
    </body>
  </html>`;
}

function AdminReportsPage() {
  const { useDemoData, orders } = useMemo(() => getOrdersSource(getOrders()), []);
  const baseOrders = useMemo(
    () => (useDemoData ? buildAdvancedReportOrders(orders, products) : orders),
    [orders, useDemoData],
  );

  const rangeBounds = useMemo(() => {
    if (!baseOrders.length) {
      const today = toInputDate(new Date());
      return { min: today, max: today };
    }

    const sortedDates = baseOrders
      .map((order) => toInputDate(order.createdAt))
      .sort((a, b) => a.localeCompare(b));

    return {
      min: sortedDates[0],
      max: sortedDates[sortedDates.length - 1],
    };
  }, [baseOrders]);

  const [dateFrom, setDateFrom] = useState(rangeBounds.min);
  const [dateTo, setDateTo] = useState(rangeBounds.max);

  const effectiveFrom = dateFrom || rangeBounds.min;
  const effectiveTo = dateTo || rangeBounds.max;

  const reportOrders = useMemo(() => {
    const fromDate = buildDateStart(effectiveFrom);
    const toDate = buildDateEnd(effectiveTo);

    return baseOrders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= fromDate && createdAt <= toDate;
    });
  }, [baseOrders, effectiveFrom, effectiveTo]);

  const productIndex = useMemo(() => new Map(products.map((product) => [product.id, product])), []);

  const statusDistribution = useMemo(() => buildStatusDistribution(reportOrders), [reportOrders]);
  const salesTrend = useMemo(() => buildSalesTrend(reportOrders), [reportOrders]);
  const topProducts = useMemo(() => buildTopProducts(reportOrders), [reportOrders]);
  const categoryPerformance = useMemo(
    () => buildCategoryPerformance(reportOrders, productIndex),
    [productIndex, reportOrders],
  );
  const paymentMix = useMemo(() => buildPaymentMix(reportOrders), [reportOrders]);
  const funnelData = useMemo(() => buildFunnelData(reportOrders), [reportOrders]);

  const summary = useMemo(() => {
    const confirmedOrders = reportOrders.filter((order) =>
      CONFIRMED_ORDER_STATUSES.includes(order.status),
    );
    const revenue = confirmedOrders.reduce((acc, order) => acc + (order.totals?.total || 0), 0);
    const discounts = confirmedOrders.reduce(
      (acc, order) => acc + (order.totals?.discount || 0),
      0,
    );
    const unitsSold = confirmedOrders.reduce(
      (acc, order) =>
        acc + (order.items || []).reduce((itemsAcc, item) => itemsAcc + (item.quantity || 0), 0),
      0,
    );
    const activeCustomers = new Set(
      reportOrders.map(
        (order) => order.customer?.phone || order.customer?.email || `${order.customer?.name}-${order.number}`,
      ),
    ).size;
    const productsWithSales = new Set(
      confirmedOrders.flatMap((order) => (order.items || []).map((item) => item.id)),
    ).size;
    const deliveredOrders = reportOrders.filter((order) => order.status === "Entregado").length;
    const riskOrders = reportOrders.filter((order) =>
      ["Pendiente de pago", "Cancelado", "Vencido"].includes(order.status),
    ).length;

    return {
      totalOrders: reportOrders.length,
      confirmedOrders: confirmedOrders.length,
      revenue,
      discounts,
      averageTicket: confirmedOrders.length ? revenue / confirmedOrders.length : 0,
      unitsSold,
      activeCustomers,
      productsWithSales,
      deliveredOrders,
      riskOrders,
    };
  }, [reportOrders]);

  const insightCards = useMemo(() => {
    const topProduct = topProducts[0];
    const topCategory = categoryPerformance[0];
    const paymentLeader = paymentMix[0];
    const deliveredShare = percent(summary.deliveredOrders, summary.totalOrders);

    return [
      {
        label: "Producto lider",
        value: topProduct ? shortenLabel(topProduct.name, 34) : "Sin rotacion",
        helper: topProduct
          ? `${topProduct.quantity} unidades y ${formatCurrency(topProduct.revenue)} facturados.`
          : "Todavia no hay ventas confirmadas en el periodo.",
      },
      {
        label: "Categoria mas activa",
        value: topCategory ? topCategory.category : "Sin categoria lider",
        helper: topCategory
          ? `${topCategory.quantity} unidades movidas y ${formatCurrency(topCategory.revenue)} facturados.`
          : "Aun no hay categorias con actividad comercial.",
      },
      {
        label: "Cobro dominante",
        value: paymentLeader ? paymentLeader.method : "Sin datos",
        helper: paymentLeader
          ? `${paymentLeader.orders} pedidos y ${formatCurrency(paymentLeader.revenue)} del total confirmado.`
          : "Aun no hay mix de pagos consolidado.",
      },
      {
        label: "Calidad operativa",
        value: `${deliveredShare}% entregado`,
        helper: `${summary.riskOrders} pedidos requieren seguimiento porque siguen pendientes o se cerraron sin entrega.`,
      },
    ];
  }, [categoryPerformance, paymentMix, summary.deliveredOrders, summary.riskOrders, summary.totalOrders, topProducts]);

  const resetDateFilters = () => {
    setDateFrom(rangeBounds.min);
    setDateTo(rangeBounds.max);
  };

  const exportReportPdf = () => {
    const reportWindow = window.open("", "_blank", "width=1200,height=900");
    if (!reportWindow) {
      return;
    }

    const generatedAt = new Date();
    reportWindow.document.write(
      buildReportDocument({
        effectiveFrom,
        effectiveTo,
        generatedAt,
        summary,
        insightCards,
        statusDistribution,
        funnelData,
        topProducts,
        categoryPerformance,
        paymentMix,
        useDemoData,
      }),
    );
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => {
      reportWindow.print();
    }, 250);
  };

  return (
    <div className="admin-page-root reports-admin-page">
      <header className="admin-page-header">
        <div className="admin-page-header-meta">
          <span>Analitica comercial</span>
          <span>
            {useDemoData
              ? "Vista demo enriquecida con mayor volumen para presentar el negocio con varias ventas."
              : "Vista consolidada con datos activos del panel administrativo."}
          </span>
        </div>
        <p>Reportes</p>
        <h1>Tablero ejecutivo de ventas y performance</h1>
        <span>
          Analiza conversion, facturacion, categorias, productos lideres y mix de cobros con una
          presentacion mas formal para mostrar el sistema a un cliente real.
        </span>
      </header>

      <section className="admin-card admin-report-toolbar-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Periodo de analisis</span>
            <h2>Filtro y exportacion</h2>
          </div>
        </div>

        <div className="admin-report-toolbar">
          <label className="admin-report-date">
            Desde
            <div className="admin-search-shell">
              <CalendarDays size={16} />
              <input
                type="date"
                min={rangeBounds.min}
                max={dateTo || rangeBounds.max}
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
          </label>

          <label className="admin-report-date">
            Hasta
            <div className="admin-search-shell">
              <CalendarDays size={16} />
              <input
                type="date"
                min={dateFrom || rangeBounds.min}
                max={rangeBounds.max}
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </label>

          <button type="button" className="admin-secondary-btn" onClick={resetDateFilters}>
            <FilterX size={16} />
            Ver todo
          </button>

          <button type="button" className="admin-report-export-btn" onClick={exportReportPdf}>
            <Download size={16} />
            Exportar PDF formal
          </button>
        </div>

        <p className="admin-report-toolbar-note">
          Mostrando estadisticas desde <b>{formatShortDate(effectiveFrom)}</b> hasta{" "}
          <b>{formatShortDate(effectiveTo)}</b>. El PDF sale en una hoja ejecutiva lista para
          guardar o presentar.
        </p>
      </section>

      <section className="admin-kpi-grid">
        <AdminStatCard
          icon={Wallet}
          title="Facturacion confirmada"
          value={formatCurrency(summary.revenue)}
          helper={`${summary.confirmedOrders} pedidos con impacto comercial confirmado.`}
          tone="highlight"
        />
        <AdminStatCard
          icon={TrendingUp}
          title="Ticket promedio"
          value={formatCurrency(summary.averageTicket)}
          helper="Promedio por pedido ya cobrado o entregado."
        />
        <AdminStatCard
          icon={ShoppingBag}
          title="Unidades vendidas"
          value={summary.unitsSold}
          helper={`${summary.productsWithSales} productos con rotacion en el periodo.`}
        />
        <AdminStatCard
          icon={Users}
          title="Clientes activos"
          value={summary.activeCustomers}
          helper="Personas que compraron o reservaron dentro del rango."
        />
        <AdminStatCard
          icon={PackageCheck}
          title="Pedidos entregados"
          value={summary.deliveredOrders}
          helper={`${percent(summary.deliveredOrders, summary.totalOrders)}% del total analizado.`}
        />
        <AdminStatCard
          icon={Activity}
          title="Pedidos en riesgo"
          value={summary.riskOrders}
          helper={`${formatCurrency(summary.discounts)} en descuentos comerciales aplicados.`}
          tone="warn"
        />
      </section>

      <section className="admin-insights-grid">
        {insightCards.map((item) => (
          <article key={item.label} className="admin-card">
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </article>
        ))}
      </section>

      <section className="admin-charts-grid">
        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Ventas por dia</p>
              <h2>Pedidos y facturacion</h2>
            </div>
            <span>Segui ritmo operativo y dias fuertes.</span>
          </div>
          <div className="admin-chart-wrap">
            {salesTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8f6a56" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#8f6a56" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eee3db" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fill: "#776b65", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "#776b65", fontSize: 12 }}
                    tickFormatter={formatCompactMoney}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "revenue" ? formatCurrency(value) : value,
                      name === "revenue" ? "Facturacion" : "Pedidos",
                    ]}
                  />
                  <Legend formatter={(value) => (value === "revenue" ? "Facturacion" : "Pedidos")} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8f6a56"
                    fill="url(#reportRevenue)"
                    strokeWidth={3}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#c28c55"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState
                compact
                title="No hay ventas dentro del rango"
                description="Amplia las fechas para ver facturacion y pedidos por dia."
              />
            )}
          </div>
        </article>

        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Distribucion operativa</p>
              <h2>Estados de pedidos</h2>
            </div>
            <span>Lectura rapida del peso de cada estado.</span>
          </div>
          <div className="admin-chart-wrap">
            {statusDistribution.some((item) => item.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDistribution}>
                  <CartesianGrid stroke="#eee3db" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: "#776b65", fontSize: 12 }}
                    tickFormatter={(value) => shortenLabel(value, 14)}
                  />
                  <YAxis tick={{ fill: "#776b65", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [value, "Pedidos"]} />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState
                compact
                title="Sin pedidos en este rango"
                description="Cuando haya actividad vas a poder ver el reparto por estado."
              />
            )}
          </div>
        </article>

        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Rotacion comercial</p>
              <h2>Top productos</h2>
            </div>
            <span>Detecta que productos empujan la facturacion.</span>
          </div>
          <div className="admin-chart-wrap">
            {topProducts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.slice(0, 6)} layout="vertical" margin={{ left: 6 }}>
                  <CartesianGrid stroke="#eee3db" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#776b65", fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fill: "#776b65", fontSize: 12 }}
                    tickFormatter={(value) => shortenLabel(value, 18)}
                  />
                  <Tooltip formatter={(value, name) => [name === "revenue" ? formatCurrency(value) : value, name === "revenue" ? "Facturacion" : "Unidades"]} />
                  <Legend formatter={(value) => (value === "revenue" ? "Facturacion" : "Unidades")} />
                  <Bar dataKey="revenue" radius={[0, 10, 10, 0]} fill="#7a5648" />
                  <Bar dataKey="quantity" radius={[0, 10, 10, 0]} fill="#c28c55" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState
                compact
                title="Sin productos vendidos"
                description="Todavia no hay items confirmados dentro del rango seleccionado."
              />
            )}
          </div>
        </article>

        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Categorias</p>
              <h2>Unidades por categoria</h2>
            </div>
            <span>Muestra que lineas traccionan mas el negocio.</span>
          </div>
          <div className="admin-chart-wrap">
            {categoryPerformance.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPerformance.slice(0, 6)}>
                  <CartesianGrid stroke="#eee3db" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: "#776b65", fontSize: 12 }}
                    tickFormatter={(value) => shortenLabel(value, 14)}
                  />
                  <YAxis tick={{ fill: "#776b65", fontSize: 12 }} />
                  <Tooltip formatter={(value, name) => [name === "revenue" ? formatCurrency(value) : value, name === "revenue" ? "Facturacion" : "Unidades"]} />
                  <Bar dataKey="quantity" radius={[10, 10, 0, 0]} fill="#c28c55" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState
                compact
                title="Sin categorias con movimiento"
                description="Las categorias apareceran cuando haya ventas confirmadas."
              />
            )}
          </div>
        </article>
      </section>

      <section className="admin-two-col admin-report-bottom-grid">
        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Embudo</span>
              <h2>Flujo operativo</h2>
            </div>
          </div>
          <div className="report-funnel-grid">
            {funnelData.map((step, index) => (
              <article key={step.label} className="report-funnel-card">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step.value}</strong>
                <b>{step.label}</b>
                <small>{step.helper}</small>
              </article>
            ))}
          </div>
        </article>

        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Medios de cobro</p>
              <h2>Mix de pagos</h2>
            </div>
            <span>Entiende como entra la caja por canal de cobro.</span>
          </div>
          <div className="admin-chart-wrap">
            {paymentMix.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMix}
                    dataKey="revenue"
                    nameKey="method"
                    innerRadius={70}
                    outerRadius={108}
                    paddingAngle={3}
                  >
                    {paymentMix.map((entry, index) => (
                      <Cell key={entry.method} fill={REPORT_PIE_COLORS[index % REPORT_PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value), "Facturacion"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState
                compact
                title="Sin mix de pagos"
                description="Confirmando ventas vas a poder ver el reparto por medio de cobro."
              />
            )}
          </div>
        </article>
      </section>

      <section className="admin-two-col admin-report-tables">
        <article className="admin-card admin-table-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Detalle comercial</span>
              <h2>Top productos del periodo</h2>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unidades</th>
                  <th>Facturacion</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 8).map((product) => (
                  <tr key={product.id}>
                    <td>
                      <b>{product.name}</b>
                      <small>{productIndex.get(product.id)?.category || "Sin categoria"}</small>
                    </td>
                    <td>{product.quantity}</td>
                    <td>{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-card admin-table-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Detalle financiero</span>
              <h2>Mix de cobros</h2>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Medio</th>
                  <th>Pedidos</th>
                  <th>Facturacion</th>
                </tr>
              </thead>
              <tbody>
                {paymentMix.map((payment) => (
                  <tr key={payment.method}>
                    <td>
                      <b>{payment.method}</b>
                      <small>{percent(payment.revenue, summary.revenue)}% del ingreso confirmado</small>
                    </td>
                    <td>{payment.orders}</td>
                    <td>{formatCurrency(payment.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}

export default AdminReportsPage;

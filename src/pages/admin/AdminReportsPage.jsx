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
import { products } from "../../data/products";
import { formatCurrency } from "../../utils/currency";
import { getOrders } from "../../utils/orders";
import {
  CONFIRMED_ORDER_STATUSES,
  getOrdersSource,
  getStatusDistribution,
  getTopProductsFromOrders,
} from "../../utils/admin";

const STATUS_COLORS = {
  "Pendiente de pago": "#cf6a58",
  "Pago confirmado": "#8d4a3a",
  "En preparacion": "#6a4b3f",
  Despachado: "#4d4540",
  Entregado: "#2b1e19",
  Cancelado: "#b54838",
  Vencido: "#d6a093",
};

const REVENUE_STATUSES = new Set(CONFIRMED_ORDER_STATUSES);

function percent(value, total) {
  if (!total) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function shortenLabel(value, max = 24) {
  if (!value) {
    return "";
  }
  return value.length <= max ? value : `${value.slice(0, max - 1)}...`;
}

function formatCompactMoney(value) {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return `$${value}`;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function buildSalesTrend(orders) {
  const byDay = new Map();

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    date.setHours(0, 0, 0, 0);
    const key = date.toISOString();
    const current = byDay.get(key) || {
      date: key,
      label: formatShortDate(key),
      pedidos: 0,
      facturacion: 0,
    };

    current.pedidos += 1;
    if (REVENUE_STATUSES.has(order.status)) {
      current.facturacion += order.totals?.total || 0;
    }

    byDay.set(key, current);
  });

  return [...byDay.values()]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);
}

function buildCategoryPerformance(orders, productIndex) {
  const map = new Map();

  orders.forEach((order) => {
    if (!REVENUE_STATUSES.has(order.status)) {
      return;
    }

    (order.items || []).forEach((item) => {
      const product = productIndex.get(item.id);
      const category = product?.category || "Sin categoria";
      const current = map.get(category) || {
        category,
        shortName: shortenLabel(category, 18),
        quantity: 0,
        revenue: 0,
      };

      current.quantity += item.quantity || 0;
      current.revenue += item.subtotal || 0;

      map.set(category, current);
    });
  });

  return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 6);
}

function buildPaymentMix(orders) {
  const labels = {
    transferencia: "Transferencia",
    efectivo: "Efectivo",
    link: "Link de pago",
  };

  const map = new Map();
  orders.forEach((order) => {
    const key = order.paymentMethod || "sin_dato";
    const current = map.get(key) || {
      method: labels[key] || key,
      count: 0,
    };
    current.count += 1;
    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => b.count - a.count);
}

function buildFunnelData(orders) {
  const pending = orders.filter((order) => order.status === "Pendiente de pago").length;
  const confirmed = orders.filter((order) => order.status === "Pago confirmado").length;
  const preparing = orders.filter((order) => order.status === "En preparacion").length;
  const shipped = orders.filter((order) => order.status === "Despachado").length;
  const delivered = orders.filter((order) => order.status === "Entregado").length;

  const steps = [
    { label: "Pendiente de pago", value: pending },
    { label: "Pago confirmado", value: confirmed },
    { label: "En preparacion", value: preparing },
    { label: "Despachado", value: shipped },
    { label: "Entregado", value: delivered },
  ];

  return steps.map((step, index) => {
    const previous = steps[index - 1]?.value || step.value || 1;
    return {
      ...step,
      rate: percent(step.value, previous),
    };
  });
}

function AdminReportsPage() {
  const initialSource = useMemo(() => getOrdersSource(getOrders()), []);
  const [orders] = useState(initialSource.orders);
  const [useDemoData] = useState(initialSource.useDemoData);

  const productIndex = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [],
  );

  const statusDistribution = useMemo(
    () => getStatusDistribution(orders).filter((item) => item.count > 0),
    [orders],
  );
  const topProducts = useMemo(() => getTopProductsFromOrders(orders, 6), [orders]);
  const salesTrend = useMemo(() => buildSalesTrend(orders), [orders]);
  const categoryPerformance = useMemo(
    () => buildCategoryPerformance(orders, productIndex),
    [orders, productIndex],
  );
  const paymentMix = useMemo(() => buildPaymentMix(orders), [orders]);
  const funnelData = useMemo(() => buildFunnelData(orders), [orders]);

  const summary = useMemo(() => {
    const revenueOrders = orders.filter((order) => REVENUE_STATUSES.has(order.status));
    const cancelledOrders = orders.filter(
      (order) => order.status === "Cancelado" || order.status === "Vencido",
    );
    const pendingPayment = orders.filter((order) => order.status === "Pendiente de pago").length;
    const activeLogistics = orders.filter(
      (order) => order.status === "En preparacion" || order.status === "Despachado",
    ).length;
    const deliveredOrders = orders.filter((order) => order.status === "Entregado").length;
    const revenue = revenueOrders.reduce((acc, order) => acc + (order.totals?.total || 0), 0);
    const avgTicket = revenueOrders.length ? Math.round(revenue / revenueOrders.length) : 0;

    return {
      totalOrders: orders.length,
      pendingPayment,
      activeLogistics,
      deliveredOrders,
      cancelledOrders: cancelledOrders.length,
      revenue,
      avgTicket,
      cancelRate: percent(cancelledOrders.length, orders.length),
    };
  }, [orders]);

  const topProductsChartData = useMemo(
    () =>
      [...topProducts]
        .sort((a, b) => b.revenue - a.revenue)
        .map((item) => ({
          ...item,
          shortName: shortenLabel(item.name, 28),
        })),
    [topProducts],
  );

  const topProduct = topProducts[0] || null;
  const topCategory = categoryPerformance[0] || null;

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Reportes</p>
        <h1>Metricas comerciales visuales</h1>
        <span>
          Lectura rapida del negocio con graficos de estados, ventas, categorias y productos mas
          fuertes.
        </span>
      </header>

      {useDemoData && (
        <section className="admin-demo-note">
          Reportes generados con datos de ejemplo para visualizar mejor la toma de decisiones.
        </section>
      )}

      <section className="admin-kpi-grid">
        <article>
          <p>Pedidos totales</p>
          <strong>{summary.totalOrders}</strong>
        </article>
        <article>
          <p>Pendiente de pago</p>
          <strong>{summary.pendingPayment}</strong>
        </article>
        <article>
          <p>Preparacion y despacho</p>
          <strong>{summary.activeLogistics}</strong>
        </article>
        <article>
          <p>Entregados</p>
          <strong>{summary.deliveredOrders}</strong>
        </article>
        <article>
          <p>Facturacion confirmada</p>
          <strong>{formatCurrency(summary.revenue)}</strong>
        </article>
        <article>
          <p>Ticket promedio</p>
          <strong>{formatCurrency(summary.avgTicket)}</strong>
        </article>
        <article>
          <p>Cancelado/vencido</p>
          <strong>{summary.cancelledOrders}</strong>
        </article>
        <article>
          <p>Tasa de cancelacion</p>
          <strong>{summary.cancelRate}%</strong>
        </article>
      </section>

      <section className="admin-charts-grid">
        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Estados</p>
              <h2>Distribucion de pedidos</h2>
            </div>
            <span>{summary.totalOrders} pedidos</span>
          </div>
          <div className="admin-chart-wrap">
            {statusDistribution.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={4}
                  >
                    {statusDistribution.map((item) => (
                      <Cell
                        key={`status-${item.status}`}
                        fill={STATUS_COLORS[item.status] || "#6a4b3f"}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} pedidos`, "Cantidad"]} />
                  <Legend verticalAlign="bottom" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="admin-chart-empty">Todavia no hay datos para este grafico.</p>
            )}
          </div>
        </article>

        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Tendencia</p>
              <h2>Pedidos y facturacion por dia</h2>
            </div>
            <span>Ultimos 7 dias con actividad</span>
          </div>
          <div className="admin-chart-wrap">
            {salesTrend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6a4b3f" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#6a4b3f" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b54838" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#b54838" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6ddd8" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompactMoney}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "Facturacion" ? formatCurrency(value) : `${value} pedidos`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="pedidos"
                    name="Pedidos"
                    stroke="#6a4b3f"
                    fill="url(#ordersGradient)"
                    strokeWidth={3}
                    yAxisId="left"
                  />
                  <Area
                    type="monotone"
                    dataKey="facturacion"
                    name="Facturacion"
                    stroke="#b54838"
                    fill="url(#revenueGradient)"
                    strokeWidth={3}
                    yAxisId="right"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="admin-chart-empty">Todavia no hay datos para este grafico.</p>
            )}
          </div>
        </article>

        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Productos</p>
              <h2>Top productos por facturacion</h2>
            </div>
            <span>{topProducts.length} destacados</span>
          </div>
          <div className="admin-chart-wrap">
            {topProductsChartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6ddd8" />
                  <XAxis
                    type="number"
                    tickFormatter={formatCompactMoney}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={172}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={(value) => [formatCurrency(value), "Facturacion"]} />
                  <Bar dataKey="revenue" name="Facturacion" fill="#6a4b3f" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="admin-chart-empty">Todavia no hay datos para este grafico.</p>
            )}
          </div>
        </article>

        <article className="admin-card admin-chart-shell">
          <div className="admin-chart-header">
            <div>
              <p>Categorias</p>
              <h2>Categorias con mas unidades</h2>
            </div>
            <span>Movimiento del catalogo</span>
          </div>
          <div className="admin-chart-wrap">
            {categoryPerformance.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryPerformance}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 18, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6ddd8" />
                  <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={152}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "Unidades" ? `${value} unidades` : formatCurrency(value),
                      name,
                    ]}
                  />
                  <Bar dataKey="quantity" name="Unidades" fill="#b54838" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="admin-chart-empty">Todavia no hay datos para este grafico.</p>
            )}
          </div>
        </article>
      </section>

      <section className="admin-insights-grid">
        <article className="admin-card">
          <p>Producto lider</p>
          <strong>{topProduct ? topProduct.name : "Sin ventas registradas"}</strong>
          <small>
            {topProduct
              ? `${topProduct.quantity} unidades y ${formatCurrency(topProduct.revenue)}`
              : "Cuando haya ventas, lo vas a ver aca."}
          </small>
        </article>
        <article className="admin-card">
          <p>Categoria mas activa</p>
          <strong>{topCategory ? topCategory.category : "Sin movimiento"}</strong>
          <small>
            {topCategory
              ? `${topCategory.quantity} unidades movidas`
              : "Todavia no hay categorias con movimiento."}
          </small>
        </article>
        <article className="admin-card">
          <p>Pedidos en riesgo</p>
          <strong>{summary.pendingPayment + summary.cancelledOrders}</strong>
          <small>Pendientes de pago mas cancelados o vencidos para seguimiento comercial.</small>
        </article>
        <article className="admin-card">
          <p>Operacion en curso</p>
          <strong>{summary.activeLogistics}</strong>
          <small>Pedidos que hoy estan entre preparacion y despacho.</small>
        </article>
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <div className="admin-card-title">
            <h2>Embudo operativo</h2>
            <span>Donde se frena la conversion</span>
          </div>
          <ul className="admin-progress-list">
            {funnelData.map((step) => (
              <li key={step.label}>
                <div>
                  <b>{step.label}</b>
                  <small>{step.value} pedidos</small>
                </div>
                <span>
                  <i style={{ width: `${Math.max(8, step.rate)}%` }} />
                </span>
                <strong>{step.rate}%</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-card">
          <div className="admin-card-title">
            <h2>Mix de pagos</h2>
            <span>Preferencias de cobro</span>
          </div>
          <ul className="admin-progress-list">
            {paymentMix.map((item) => (
              <li key={item.method}>
                <div>
                  <b>{item.method}</b>
                  <small>{item.count} pedidos</small>
                </div>
                <span>
                  <i style={{ width: `${percent(item.count, summary.totalOrders)}%` }} />
                </span>
                <strong>{percent(item.count, summary.totalOrders)}%</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

export default AdminReportsPage;

import { useMemo } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  Package,
  PackageCheck,
  PackageX,
  TimerReset,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import AdminStatCard from "../../components/admin/AdminStatCard";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import { products } from "../../data/products";
import { formatCompactDate, formatCurrency } from "../../utils/currency";
import { getOrders } from "../../utils/orders";
import {
  ADMIN_WORKFLOW_STEPS,
  getAdminMetrics,
  getOrdersSource,
  getTopProductsFromOrders,
} from "../../utils/admin";

const dashboardMetricConfig = [
  {
    key: "totalOrders",
    title: "Pedidos totales",
    icon: ClipboardList,
    helper: "Base operativa del periodo actual.",
  },
  {
    key: "pendingPayment",
    title: "Pendiente de pago",
    icon: TimerReset,
    helper: "Reservas esperando acreditacion.",
    tone: "warn",
  },
  {
    key: "confirmedPayment",
    title: "Pago confirmado",
    icon: CheckCircle2,
    helper: "Pedidos listos para pasar a armado.",
  },
  {
    key: "inPreparation",
    title: "En preparacion",
    icon: Package,
    helper: "Pedidos hoy en armado operativo.",
  },
  {
    key: "dispatched",
    title: "Despachados",
    icon: Truck,
    helper: "Salieron a entrega o sucursal.",
  },
  {
    key: "delivered",
    title: "Entregados",
    icon: PackageCheck,
    helper: "Ventas ya cerradas comercialmente.",
  },
  {
    key: "cancelled",
    title: "Cancelado o vencido",
    icon: PackageX,
    helper: "Pedidos caidos para revisar causa.",
    tone: "danger",
  },
  {
    key: "confirmedRevenue",
    title: "Facturacion confirmada",
    icon: BadgeDollarSign,
    helper: "Ingresos consolidados con pago validado.",
    format: formatCurrency,
    tone: "highlight",
  },
];

function AdminOverviewPage() {
  const realOrders = useMemo(() => getOrders(), []);
  const { orders, useDemoData } = useMemo(() => getOrdersSource(realOrders), [realOrders]);

  const metrics = useMemo(() => getAdminMetrics(orders), [orders]);
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const topProducts = useMemo(() => getTopProductsFromOrders(orders, 5), [orders]);
  const lowStockProducts = useMemo(() => {
    const savedThreshold = Number(window.localStorage.getItem("grizzly_low_stock_threshold"));
    const threshold = Number.isFinite(savedThreshold) && savedThreshold > 0 ? savedThreshold : 12;
    return products.filter((product) => product.stock <= threshold);
  }, []);

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Dashboard</p>
        <h1>Control operativo integral</h1>
        <span>
          Vista general para seguir cobros, preparacion, despachos, entregas, ventas y alertas de
          stock desde un solo panel.
        </span>
        <div className="admin-page-header-meta">
          <span>Panel administrativo</span>
          <span>Operacion comercial diaria</span>
          <span>{orders.length} pedidos visibles</span>
        </div>
      </header>

      {useDemoData && (
        <section className="admin-demo-note">
          Mostrando datos de ejemplo para que veas como quedaria el panel con pedidos reales.
        </section>
      )}

      <section className="admin-kpi-grid">
        {dashboardMetricConfig.map((item) => (
          <AdminStatCard
            key={item.key}
            icon={item.icon}
            title={item.title}
            value={item.format ? item.format(metrics[item.key]) : metrics[item.key]}
            helper={item.helper}
            tone={item.tone}
          />
        ))}
      </section>

      <section className="admin-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Operacion</span>
            <h2>Flujo operativo de pedidos</h2>
          </div>
          <Link to="/admin/pedidos">Ir a gestion de pedidos</Link>
        </div>
        <ol className="workflow-grid">
          {ADMIN_WORKFLOW_STEPS.map((step, index) => (
            <li key={step.status}>
              <div className="workflow-step-top">
                <span className="workflow-step-index">0{index + 1}</span>
                <OrderStatusBadge status={step.status} />
              </div>
              <p>{step.action}</p>
              <small>{step.stockImpact}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Seguimiento</span>
              <h2>Pedidos recientes</h2>
            </div>
            <Link to="/admin/pedidos">Abrir lista completa</Link>
          </div>
          {!recentOrders.length ? (
            <AdminEmptyState
              compact
              title="Todavia no hay pedidos recientes"
              description="Cuando entren ventas desde el checkout, las ultimas operaciones van a aparecer aca."
            />
          ) : (
            <ul className="admin-simple-list">
              {recentOrders.map((order) => (
                <li key={order.number}>
                  <div>
                    <b>#{order.number}</b>
                    <small>{order.customer?.name}</small>
                    <small>{formatCompactDate(order.createdAt)}</small>
                  </div>
                  <div>
                    <b>{formatCurrency(order.totals?.total || 0)}</b>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Rotacion</span>
              <h2>Top productos vendidos</h2>
            </div>
            <Link to="/admin/productos">Gestionar productos</Link>
          </div>
          {!topProducts.length ? (
            <AdminEmptyState
              compact
              title="Sin ventas confirmadas todavia"
              description="A medida que se entreguen pedidos, vas a poder detectar rapido los productos con mejor salida."
            />
          ) : (
            <ul className="admin-simple-list">
              {topProducts.map((item) => (
                <li key={item.id}>
                  <div>
                    <b>{item.name}</b>
                    <small>{item.quantity} unidades vendidas</small>
                  </div>
                  <b>{formatCurrency(item.revenue)}</b>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Inventario</span>
            <h2>Alertas de stock bajo</h2>
          </div>
          <Link to="/admin/stock">Configurar umbral global</Link>
        </div>
        {!lowStockProducts.length ? (
          <AdminEmptyState
            compact
            title="No hay alertas criticas por ahora"
            description="El stock actual esta por encima del umbral definido para toda la tienda."
          />
        ) : (
          <ul className="stock-alerts">
            {lowStockProducts.map((product) => (
              <li key={product.id}>
                <img src={product.image} alt={product.name} />
                <div>
                  <b>{product.name}</b>
                  <small>{product.category}</small>
                </div>
                <strong>
                  <AlertTriangle size={15} />
                  {product.stock} u.
                </strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdminOverviewPage;

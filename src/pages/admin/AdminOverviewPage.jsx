import { useMemo } from "react";
import { Link } from "react-router-dom";
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
      </header>

      {useDemoData && (
        <section className="admin-demo-note">
          Mostrando datos de ejemplo para que veas como quedaria el panel con pedidos reales.
        </section>
      )}

      <section className="admin-kpi-grid">
        <article>
          <p>Pedidos totales</p>
          <strong>{metrics.totalOrders}</strong>
        </article>
        <article>
          <p>Pendiente de pago</p>
          <strong>{metrics.pendingPayment}</strong>
        </article>
        <article>
          <p>Pago confirmado</p>
          <strong>{metrics.confirmedPayment}</strong>
        </article>
        <article>
          <p>En preparacion</p>
          <strong>{metrics.inPreparation}</strong>
        </article>
        <article>
          <p>Despachados</p>
          <strong>{metrics.dispatched}</strong>
        </article>
        <article>
          <p>Entregados</p>
          <strong>{metrics.delivered}</strong>
        </article>
        <article>
          <p>Cancelado/vencido</p>
          <strong>{metrics.cancelled}</strong>
        </article>
        <article>
          <p>Facturacion confirmada</p>
          <strong>{formatCurrency(metrics.confirmedRevenue)}</strong>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-card-title">
          <h2>Flujo operativo de pedidos</h2>
          <Link to="/admin/pedidos">Ir a gestion de pedidos</Link>
        </div>
        <ol className="workflow-grid">
          {ADMIN_WORKFLOW_STEPS.map((step) => (
            <li key={step.status}>
              <OrderStatusBadge status={step.status} />
              <p>{step.action}</p>
              <small>{step.stockImpact}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <div className="admin-card-title">
            <h2>Pedidos recientes</h2>
            <Link to="/admin/pedidos">Abrir lista completa</Link>
          </div>
          {!recentOrders.length ? (
            <p>No hay pedidos aun. Se cargan desde checkout cliente.</p>
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
            <h2>Top productos vendidos</h2>
            <Link to="/admin/productos">Gestionar productos</Link>
          </div>
          {!topProducts.length ? (
            <p>Sin ventas confirmadas todavia.</p>
          ) : (
            <ul className="admin-simple-list">
              {topProducts.map((item) => (
                <li key={item.id}>
                  <div>
                    <b>{item.name}</b>
                    <small>{item.quantity} unidades</small>
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
          <h2>Alertas de stock bajo</h2>
          <Link to="/admin/stock">Configurar umbral global</Link>
        </div>
        <ul className="stock-alerts">
          {lowStockProducts.map((product) => (
            <li key={product.id}>
              <img src={product.image} alt={product.name} />
              <div>
                <b>{product.name}</b>
                <small>{product.category}</small>
              </div>
              <strong>{product.stock} u.</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default AdminOverviewPage;

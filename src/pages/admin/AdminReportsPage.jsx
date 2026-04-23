import { useMemo, useState } from "react";
import { products } from "../../data/products";
import { formatCurrency } from "../../utils/currency";
import { getOrders } from "../../utils/orders";
import { getOrdersSource, getStatusDistribution, getTopProductsFromOrders } from "../../utils/admin";

function percent(value, total) {
  if (!total) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function AdminReportsPage() {
  const initialSource = useMemo(() => getOrdersSource(getOrders()), []);
  const [orders] = useState(initialSource.orders);
  const [useDemoData] = useState(initialSource.useDemoData);

  const statusDistribution = useMemo(() => getStatusDistribution(orders), [orders]);
  const topProducts = useMemo(() => getTopProductsFromOrders(orders, 10), [orders]);

  const summary = useMemo(() => {
    const paidOrders = orders.filter(
      (order) => order.status === "Pago confirmado" || order.status === "Entregado",
    );
    const canceledOrders = orders.filter(
      (order) => order.status === "Cancelado" || order.status === "Vencido",
    );
    const revenue = paidOrders.reduce((acc, order) => acc + (order.totals?.total || 0), 0);
    const avgTicket = paidOrders.length ? Math.round(revenue / paidOrders.length) : 0;

    return {
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      canceledOrders: canceledOrders.length,
      revenue,
      avgTicket,
      cancelRate: percent(canceledOrders.length, orders.length),
    };
  }, [orders]);

  const maxStatus = Math.max(...statusDistribution.map((item) => item.count), 1);
  const productIndex = useMemo(() => {
    const map = new Map();
    products.forEach((product) => map.set(product.id, product));
    return map;
  }, []);

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Reportes</p>
        <h1>Metricas comerciales</h1>
        <span>
          Ventas por periodo, ticket promedio, estados de pedidos y productos mas vendidos.
        </span>
      </header>

      {useDemoData && (
        <section className="admin-demo-note">
          Reportes generados con datos de ejemplo para visualizar rendimiento por productos.
        </section>
      )}

      <section className="admin-kpi-grid">
        <article>
          <p>Pedidos totales</p>
          <strong>{summary.totalOrders}</strong>
        </article>
        <article>
          <p>Pedidos cobrados</p>
          <strong>{summary.paidOrders}</strong>
        </article>
        <article>
          <p>Cancelados/Vencidos</p>
          <strong>{summary.canceledOrders}</strong>
        </article>
        <article>
          <p>Facturacion</p>
          <strong>{formatCurrency(summary.revenue)}</strong>
        </article>
        <article>
          <p>Ticket promedio</p>
          <strong>{formatCurrency(summary.avgTicket)}</strong>
        </article>
        <article>
          <p>Tasa de cancelacion</p>
          <strong>{summary.cancelRate}%</strong>
        </article>
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <h2>Distribucion por estado</h2>
          <ul className="status-bars">
            {statusDistribution.map((item) => (
              <li key={item.status}>
                <div>
                  <b>{item.status}</b>
                  <small>{item.count} pedidos</small>
                </div>
                <span>
                  <i style={{ width: `${(item.count / maxStatus) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-card">
          <h2>Top productos vendidos</h2>
          {!topProducts.length ? (
            <p>No hay ventas registradas todavia.</p>
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
        <h2>Rendimiento por producto</h2>
        {!topProducts.length ? (
          <p>No hay productos para mostrar.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Unidades vendidas</th>
                  <th>Facturacion</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((item) => {
                  const product = productIndex.get(item.id);
                  return (
                    <tr key={`product-report-${item.id}`}>
                      <td>
                        <div className="table-product">
                          <img src={product?.image || "/assets/products/creatina-300-bag.jpg"} alt={item.name} />
                          <div>
                            <b>{item.name}</b>
                            <small>{product?.category || "Sin categoria"}</small>
                          </div>
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2>Checklist de cierre comercial diario</h2>
        <ul className="admin-list">
          <li>Revisar pedidos en Pendiente de confirmacion.</li>
          <li>Contactar pagos pendientes e informar alias/CBU.</li>
          <li>Verificar comprobantes en Pago informado.</li>
          <li>Confirmar pagos validos y pasar a En preparacion.</li>
          <li>Actualizar despachos/retiros y marcar Entregado.</li>
          <li>Registrar cancelaciones/vencimientos para liberar stock.</li>
        </ul>
      </section>
    </div>
  );
}

export default AdminReportsPage;

import { useMemo, useState } from "react";
import { CircleHelp, Search, ShieldCheck, TimerReset, Wallet } from "lucide-react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import AdminStatCard from "../../components/admin/AdminStatCard";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import { formatCompactDate, formatCurrency } from "../../utils/currency";
import { getOrders, updateOrderStatus } from "../../utils/orders";
import { getOrdersSource, getPaymentStageOrders, updateOrderStatusInMemory } from "../../utils/admin";

function getActionTone(currentStatus, targetStatus) {
  if (
    (currentStatus === "Pendiente de pago" && targetStatus === "Pago confirmado") ||
    (currentStatus === "Pago confirmado" && targetStatus === "En preparacion")
  ) {
    return "primary";
  }
  if (targetStatus === "Cancelado" || targetStatus === "Vencido") {
    return "danger";
  }
  return "secondary";
}

function AdminPaymentsPage() {
  const initialSource = useMemo(() => getOrdersSource(getOrders()), []);
  const [orders, setOrders] = useState(initialSource.orders);
  const [useDemoData] = useState(initialSource.useDemoData);
  const [search, setSearch] = useState("");

  const paymentOrders = useMemo(() => {
    const filtered = getPaymentStageOrders(orders);
    const term = search.trim().toLowerCase();
    if (!term) {
      return filtered;
    }

    return filtered.filter(
      (order) =>
        order.number.includes(term) ||
        (order.customer?.name || "").toLowerCase().includes(term) ||
        (order.customer?.phone || "").includes(term),
    );
  }, [orders, search]);

  const summary = useMemo(() => {
    const pending = paymentOrders.filter((order) => order.status === "Pendiente de pago").length;
    const confirmed = paymentOrders.filter((order) => order.status === "Pago confirmado").length;
    const expired = paymentOrders.filter((order) => order.status === "Vencido").length;
    const expected = paymentOrders.reduce((acc, order) => acc + (order.totals?.total || 0), 0);

    return { pending, confirmed, expired, expected };
  }, [paymentOrders]);

  const changeStatus = (orderNumber, status) => {
    if (useDemoData) {
      setOrders((prev) => updateOrderStatusInMemory(prev, orderNumber, status));
    } else {
      updateOrderStatus(orderNumber, status);
      setOrders(getOrders());
    }
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Pagos</p>
        <h1>Control manual de cobros</h1>
        <span>
          Gestion del circuito de cobro para confirmar pagos, liberar reservas vencidas o derivar
          pedidos a preparacion.
        </span>
      </header>

      {useDemoData && (
        <section className="admin-demo-note">
          Estas viendo ejemplos de pagos para visualizar el flujo completo de validacion manual.
        </section>
      )}

      <section className="admin-kpi-grid">
        <AdminStatCard
          icon={Wallet}
          title="Monto esperado"
          value={formatCurrency(summary.expected)}
          helper="Suma operativa de pedidos en circuito de pago."
          tone="highlight"
        />
        <AdminStatCard
          icon={TimerReset}
          title="Pendientes"
          value={summary.pending}
          helper="Reservas esperando verificacion manual."
          tone="warn"
        />
        <AdminStatCard
          icon={ShieldCheck}
          title="Confirmados"
          value={summary.confirmed}
          helper="Cobros listos para pasar a armado."
        />
        <AdminStatCard
          icon={CircleHelp}
          title="Vencidos"
          value={summary.expired}
          helper="Pedidos a revisar por falta de acreditacion."
          tone="danger"
        />
      </section>

      <section className="admin-card payment-config">
        <article className="admin-guide-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Cobro</span>
              <h2>Datos de cobro</h2>
            </div>
          </div>
          <div className="admin-detail-list compact">
            <p>
              <span>Alias</span>
              <b>grizzly.suplementos</b>
            </p>
            <p>
              <span>CBU</span>
              <b>0000003100000000123456</b>
            </p>
            <p>
              <span>Banco</span>
              <b>Banco Nacion</b>
            </p>
            <p>
              <span>Regla operativa</span>
              <b>Si no se acredita en 24h, el pedido puede pasar a Vencido.</b>
            </p>
          </div>
        </article>
        <article className="admin-guide-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Criterio comercial</span>
              <h2>Estados comerciales de pago</h2>
            </div>
          </div>
          <ul className="admin-guide-list">
            <li>
              <b>Pendiente de pago</b>
              <small>Reserva de stock y espera de acreditacion.</small>
            </li>
            <li>
              <b>Pago confirmado</b>
              <small>Cobro validado y pedido listo para preparacion.</small>
            </li>
            <li>
              <b>Vencido</b>
              <small>Se libera la reserva por falta de pago.</small>
            </li>
            <li>
              <b>Cancelado</b>
              <small>Anulacion manual por decision comercial.</small>
            </li>
          </ul>
        </article>
      </section>

      <section className="admin-card admin-table-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Validacion</span>
            <h2>Pedidos en etapa de pago</h2>
          </div>
        </div>
        <div className="admin-toolbar admin-toolbar-orders">
          <label className="admin-search-shell">
            <Search size={17} />
            <input
              type="search"
              value={search}
              placeholder="Buscar por cliente, pedido o telefono"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {!paymentOrders.length ? (
          <AdminEmptyState
            title="No hay pedidos en etapas de pago"
            description="Cuando aparezcan reservas o cobros manuales por validar, se listan aca."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-payments-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Monto esperado</th>
                  <th>Estado pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paymentOrders.map((order) => (
                  <tr key={order.number}>
                    <td>
                      <b>#{order.number}</b>
                    </td>
                    <td>
                      <b>{order.customer?.name}</b>
                      <small>{order.customer?.phone}</small>
                    </td>
                    <td>{formatCompactDate(order.createdAt)}</td>
                    <td>{formatCurrency(order.totals?.total || 0)}</td>
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td>
                      <div className="table-actions payment-actions">
                        {[
                          ["Pendiente", "Pendiente de pago"],
                          ["Confirmar", "Pago confirmado"],
                          ["Preparar", "En preparacion"],
                          ["Vencer", "Vencido"],
                          ["Cancelar", "Cancelado"],
                        ].map(([label, targetStatus]) => (
                          <button
                            key={`${order.number}-${targetStatus}`}
                            type="button"
                            className={`admin-action-btn ${getActionTone(order.status, targetStatus)}`}
                            onClick={() => changeStatus(order.number, targetStatus)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminPaymentsPage;

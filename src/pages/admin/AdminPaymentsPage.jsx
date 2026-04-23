import { useMemo, useState } from "react";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import { formatCompactDate, formatCurrency } from "../../utils/currency";
import { getOrders, updateOrderStatus } from "../../utils/orders";
import { getOrdersSource, getPaymentStageOrders, updateOrderStatusInMemory } from "../../utils/admin";

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
          Gestion del circuito pendiente de pago, pago informado, pago confirmado o rechazo.
        </span>
      </header>

      {useDemoData && (
        <section className="admin-demo-note">
          Estas viendo ejemplos de pagos para visualizar el flujo completo de validacion manual.
        </section>
      )}

      <section className="admin-card payment-config">
        <article>
          <h3>Datos de cobro</h3>
          <p>
            <b>Alias:</b> grizzly.suplementos
          </p>
          <p>
            <b>CBU:</b> 0000003100000000123456
          </p>
          <p>
            <b>Banco:</b> Banco Nacion
          </p>
          <p>
            <b>Regla:</b> Si no hay pago informado en 24h, el pedido puede pasar a Vencido.
          </p>
        </article>
        <article>
          <h3>Estados comerciales de pago</h3>
          <ul>
            <li>Pendiente de pago: reserva de stock.</li>
            <li>Pago informado: cliente envio comprobante.</li>
            <li>Pago confirmado: se descuenta stock definitivo.</li>
            <li>Cancelado / vencido: se libera reserva.</li>
          </ul>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            type="search"
            value={search}
            placeholder="Buscar por cliente, pedido o telefono"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {!paymentOrders.length ? (
          <p>No hay pedidos en etapas de pago.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
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
                    <td>#{order.number}</td>
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
                      <div className="table-actions">
                        <button
                          type="button"
                          onClick={() => changeStatus(order.number, "Pendiente de pago")}
                        >
                          Pendiente
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStatus(order.number, "Pago informado")}
                        >
                          Informado
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStatus(order.number, "Pago confirmado")}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => changeStatus(order.number, "Cancelado")}
                        >
                          Rechazar
                        </button>
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

import { useEffect, useMemo, useState } from "react";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import { ORDER_STATUSES } from "../../data/constants";
import { formatCompactDate, formatCurrency } from "../../utils/currency";
import { getOrders, updateOrderStatus } from "../../utils/orders";
import { getOrdersSource, updateOrderStatusInMemory } from "../../utils/admin";

function AdminOrdersPage() {
  const initialSource = useMemo(() => getOrdersSource(getOrders()), []);
  const [orders, setOrders] = useState(initialSource.orders);
  const [useDemoData] = useState(initialSource.useDemoData);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedNumber, setSelectedNumber] = useState("");

  const visibleOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = !statusFilter || order.status === statusFilter;
      const term = search.trim().toLowerCase();
      const matchesTerm =
        !term ||
        order.number.includes(term) ||
        (order.customer?.name || "").toLowerCase().includes(term) ||
        (order.customer?.phone || "").includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [orders, search, statusFilter]);

  const selectedOrder = useMemo(
    () => visibleOrders.find((order) => order.number === selectedNumber) || null,
    [selectedNumber, visibleOrders],
  );

  useEffect(() => {
    const exists = visibleOrders.some((order) => order.number === selectedNumber);
    if ((!selectedNumber || !exists) && visibleOrders.length) {
      setSelectedNumber(visibleOrders[0].number);
    }
  }, [selectedNumber, visibleOrders]);

  const handleStatusChange = (orderNumber, nextStatus) => {
    if (useDemoData) {
      setOrders((prev) => updateOrderStatusInMemory(prev, orderNumber, nextStatus));
    } else {
      updateOrderStatus(orderNumber, nextStatus);
      setOrders(getOrders());
    }
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Pedidos</p>
        <h1>Gestion completa de pedidos</h1>
        <span>
          Validar stock, actualizar estado, preparar entrega y cerrar operaciones desde un solo
          panel.
        </span>
      </header>

      {useDemoData && (
        <section className="admin-demo-note">
          Datos cargados en modo ejemplo. Al tener pedidos reales, esta tabla se completa
          automaticamente con tu operacion.
        </section>
      )}

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            type="search"
            value={search}
            placeholder="Buscar por pedido, cliente o telefono"
            onChange={(event) => setSearch(event.target.value)}
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Todos los estados</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {!visibleOrders.length ? (
          <p>No hay pedidos con los filtros actuales.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Cambiar estado</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order.number} onClick={() => setSelectedNumber(order.number)}>
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
                      <select
                        value={order.status}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => handleStatusChange(order.number, event.target.value)}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={`${order.number}-${status}`} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedOrder && (
        <section className="admin-card">
          <h2>Detalle operativo del pedido #{selectedOrder.number}</h2>
          <div className="admin-two-col">
            <article>
              <h3>Datos cliente y entrega</h3>
              <p>
                <b>Cliente:</b> {selectedOrder.customer?.name}
              </p>
              <p>
                <b>Telefono:</b> {selectedOrder.customer?.phone}
              </p>
              <p>
                <b>Entrega:</b>{" "}
                {selectedOrder.delivery?.type === "envio" ? "Envio a domicilio" : "Retiro presencial"}
              </p>
              {selectedOrder.delivery?.type === "envio" ? (
                <p>
                  <b>Direccion:</b> {selectedOrder.delivery?.address} -{" "}
                  {selectedOrder.delivery?.locality} ({selectedOrder.delivery?.postalCode})
                </p>
              ) : (
                <p>
                  <b>Retira:</b> {selectedOrder.delivery?.pickupPerson} -{" "}
                  {selectedOrder.delivery?.pickupWindow || "A coordinar"}
                </p>
              )}
              <p>
                <b>Metodo de pago:</b> {selectedOrder.paymentMethod}
              </p>
              {selectedOrder.observation && (
                <p>
                  <b>Observacion:</b> {selectedOrder.observation}
                </p>
              )}
            </article>

            <article>
              <h3>Items y control de stock</h3>
              <ul className="admin-simple-list">
                {(selectedOrder.items || []).map((item) => (
                  <li key={`${selectedOrder.number}-${item.id}`}>
                    <div>
                      <b>{item.name}</b>
                      <small>x{item.quantity}</small>
                    </div>
                    <b>{formatCurrency(item.subtotal)}</b>
                  </li>
                ))}
              </ul>
              <p>
                <b>Subtotal:</b> {formatCurrency(selectedOrder.totals?.subtotal || 0)}
              </p>
              <p>
                <b>Descuentos:</b> {formatCurrency(selectedOrder.totals?.discount || 0)}
              </p>
              <p>
                <b>Envio:</b> {formatCurrency(selectedOrder.totals?.shipping || 0)}
              </p>
              <p>
                <b>Total:</b> {formatCurrency(selectedOrder.totals?.total || 0)}
              </p>
            </article>
          </div>

          <div className="admin-history">
            <h3>Historial de estados</h3>
            <ul>
              {(selectedOrder.statusHistory || []).map((entry, index) => (
                <li key={`${selectedOrder.number}-${entry.status}-${index}`}>
                  <OrderStatusBadge status={entry.status} />
                  <small>{formatCompactDate(entry.timestamp)}</small>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

export default AdminOrdersPage;

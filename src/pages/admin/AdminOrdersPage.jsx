import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import { ORDER_STATUSES } from "../../data/constants";
import { formatCompactDate, formatCurrency } from "../../utils/currency";
import { getOrders, updateOrderStatus } from "../../utils/orders";
import { getOrdersSource, updateOrderStatusInMemory } from "../../utils/admin";
import { buildWhatsAppLink } from "../../utils/whatsapp";

function getOrderWhatsAppLink(order) {
  return buildWhatsAppLink(
    order.customer?.phone,
    `Hola ${order.customer?.name || ""}, te escribimos desde Grizzly Suplementos por tu pedido #${order.number}.`,
  );
}

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

      <section className="admin-card admin-table-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Seguimiento comercial</span>
            <h2>Listado operativo de pedidos</h2>
          </div>
        </div>
        <div className="admin-toolbar admin-toolbar-orders">
          <label className="admin-search-shell">
            <Search size={17} />
            <input
              type="search"
              value={search}
              placeholder="Buscar por pedido, cliente o telefono"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
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
          <AdminEmptyState
            title="No hay pedidos con los filtros actuales"
            description="Proba con otro estado o una busqueda mas amplia para volver a cargar el listado."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-orders-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Contacto</th>
                  <th>Cambiar estado</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => {
                  const whatsappLink = getOrderWhatsAppLink(order);

                  return (
                    <tr
                      key={order.number}
                      className={selectedNumber === order.number ? "is-selected" : ""}
                      onClick={() => setSelectedNumber(order.number)}
                    >
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
                        {whatsappLink ? (
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="admin-whatsapp-btn compact"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MessageCircle size={16} />
                            WhatsApp
                          </a>
                        ) : (
                          <span className="admin-cell-muted">Sin telefono</span>
                        )}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedOrder && (
        <section className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Ficha comercial</span>
              <h2>Detalle operativo del pedido #{selectedOrder.number}</h2>
            </div>
            <OrderStatusBadge status={selectedOrder.status} />
          </div>

          <div className="admin-detail-grid">
            <article className="admin-detail-card">
              <h3>Datos del cliente y entrega</h3>
              <div className="admin-detail-list">
                <p>
                  <span>Cliente</span>
                  <b>{selectedOrder.customer?.name}</b>
                </p>
                <p>
                  <span>Telefono</span>
                  <b>{selectedOrder.customer?.phone}</b>
                </p>
                <p>
                  <span>Metodo de pago</span>
                  <b>{selectedOrder.paymentMethod}</b>
                </p>
                <p>
                  <span>Tipo de entrega</span>
                  <b>
                    {selectedOrder.delivery?.type === "envio"
                      ? "Envio a domicilio"
                      : "Retiro presencial"}
                  </b>
                </p>
                {selectedOrder.delivery?.type === "envio" ? (
                  <p>
                    <span>Direccion</span>
                    <b>
                      {selectedOrder.delivery?.address} - {selectedOrder.delivery?.locality} (
                      {selectedOrder.delivery?.postalCode})
                    </b>
                  </p>
                ) : (
                  <p>
                    <span>Retira</span>
                    <b>
                      {selectedOrder.delivery?.pickupPerson} -{" "}
                      {selectedOrder.delivery?.pickupWindow || "A coordinar"}
                    </b>
                  </p>
                )}
                {selectedOrder.observation ? (
                  <p>
                    <span>Observacion</span>
                    <b>{selectedOrder.observation}</b>
                  </p>
                ) : null}
              </div>

              {getOrderWhatsAppLink(selectedOrder) ? (
                <a
                  href={getOrderWhatsAppLink(selectedOrder)}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-whatsapp-btn"
                >
                  <MessageCircle size={18} />
                  Abrir WhatsApp del cliente
                </a>
              ) : null}
            </article>

            <article className="admin-detail-card">
              <h3>Items, subtotal y total final</h3>
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
              <div className="admin-totals-list">
                <p>
                  <span>Subtotal</span>
                  <b>{formatCurrency(selectedOrder.totals?.subtotal || 0)}</b>
                </p>
                <p>
                  <span>Descuentos</span>
                  <b>{formatCurrency(selectedOrder.totals?.discount || 0)}</b>
                </p>
                <p>
                  <span>Envio</span>
                  <b>{formatCurrency(selectedOrder.totals?.shipping || 0)}</b>
                </p>
                <p className="is-total">
                  <span>Total</span>
                  <b>{formatCurrency(selectedOrder.totals?.total || 0)}</b>
                </p>
              </div>
            </article>
          </div>

          <div className="admin-history admin-history-timeline">
            <div className="admin-card-title">
              <div>
                <span className="admin-card-kicker">Historial</span>
                <h3>Linea de estados</h3>
              </div>
            </div>
            <ul className="admin-timeline">
              {(selectedOrder.statusHistory || []).map((entry, index, history) => (
                <li
                  key={`${selectedOrder.number}-${entry.status}-${index}`}
                  className={index === history.length - 1 ? "is-current" : ""}
                >
                  <span className="admin-timeline-step">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <OrderStatusBadge status={entry.status} />
                    <small>{formatCompactDate(entry.timestamp)}</small>
                  </div>
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

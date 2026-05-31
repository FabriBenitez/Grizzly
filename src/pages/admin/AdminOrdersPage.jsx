import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import AdminEmptyState from "../../components/admin/AdminEmptyState";
import OrderStatusBadge from "../../components/ui/OrderStatusBadge";
import { useAdminOrdersData } from "../../hooks/useAdminOrdersData";
import { ORDER_STATUSES } from "../../data/constants";
import { formatCompactDate, formatCurrency } from "../../utils/currency";
import { buildWhatsAppLink } from "../../utils/whatsapp";
import { CONFIRMED_ORDER_STATUSES } from "../../utils/admin";

function getOrderWhatsAppLink(order) {
  return buildWhatsAppLink(
    order.customer?.phone,
    `Hola ${order.customer?.name || ""}, te escribimos desde Grizzly Suplementos por tu pedido #${order.number}.`,
  );
}

function AdminOrdersPage() {
  const { orders, loading, error, updateStatus } = useAdminOrdersData();
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
    updateStatus(orderNumber, nextStatus);
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

      {!loading && error && <section className="admin-demo-note">{error}</section>}

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

        {!loading && !visibleOrders.length ? (
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
                  <th>Pagado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td><div className="skeleton skeleton-text" style={{ width: 60 }}></div></td>
                      <td>
                        <div className="skeleton skeleton-text" style={{ width: 120 }}></div>
                        <div className="skeleton skeleton-text" style={{ width: 80, height: 10 }}></div>
                      </td>
                      <td><div className="skeleton skeleton-text" style={{ width: 80 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 70 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 90, height: 24, borderRadius: 999 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 32, height: 32, borderRadius: 12 }}></div></td>
                      <td><div className="skeleton skeleton-text" style={{ width: 24, height: 24, borderRadius: 6 }}></div></td>
                    </tr>
                  ))
                ) : (
                  visibleOrders.map((order) => {
                    const whatsappLink = getOrderWhatsAppLink(order);
                    const isPaid = CONFIRMED_ORDER_STATUSES.includes(order.status);

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
                              className="admin-whatsapp-btn compact icon-only"
                              title="Contactar por WhatsApp"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="18" height="18">
                                <path fill="#25D366" d="M3.20676 47.591c-.00237 7.924 2.06817 15.6613 6.00506 22.4808l-6.38174 23.301 23.84542-6.2524c6.5694 3.5806 13.9665 5.4706 21.4944 5.4725h.0199c24.7897 0 44.9692-20.1724 44.9796-44.9664.0048-12.0148-4.6698-23.3123-13.1629-31.812C71.5149 7.3153 60.2212 2.63217 48.1879 2.62695 23.3953 2.62695 3.21718 22.798 3.20676 47.591Z" />
                                <path fill="#ffffff" d="M1.60084 47.5769C1.598 55.7861 3.74293 63.8001 7.82006 70.8637L1.20947 95l24.70063-6.4765c6.8058 3.7109 14.4683 5.6672 22.2657 5.6701h.0199c25.6791 0 46.5836-20.8979 46.5945-46.5793.0042-12.4465-4.8386-24.15-13.6349-32.9544C72.3577 5.85655 60.6598 1.00521 48.1957 1 22.5119 1 1.61126 21.8945 1.60084 47.5769ZM16.3103 69.6474l-.9221-1.4641c-3.8772-6.1647-5.92355-13.2884-5.92071-20.6036C9.47603 26.2337 26.8483 8.86713 48.2104 8.86713 58.5551 8.8714 68.2777 12.904 75.59 20.221c7.3123 7.3175 11.3359 17.0448 11.333 27.3905-.0095 21.3465-17.3822 38.7154-38.7273 38.7154h-.0151c-6.9503-.0038-13.7666-1.8701-19.7114-5.3971l-1.4148-.8392-14.6578 3.8431 3.9137-14.2863Z" />
                                <path fill="#ffffff" d="M36.55 28.1053c-.8723-1.9389-1.79-1.9777-2.6197-2.0118-.6789-.0289-1.4555-.0271-2.2311-.0271-.7766 0-2.0379.2919-3.1044 1.4565-1.0675 1.1651-4.0753 3.9815-4.0753 9.7093 0 5.7284 4.1724 11.2634 4.7538 12.041.5823.7761 8.0542 12.9065 19.8876 17.5731 9.8349 3.8781 11.8363 3.1068 13.9708 2.9125 2.1345-.1938 6.8882-2.8154 7.8581-5.5341.9704-2.7182.9704-5.0484.6795-5.535-.291-.4852-1.0675-.7766-2.2317-1.3585-1.1646-.5823-6.8882-3.3991-7.9552-3.7876-1.0675-.388-1.8436-.5818-2.6202.5837-.7761 1.1642-3.0059 3.7858-3.6853 4.5624-.679.778-1.3584.8751-2.5226.2928-1.1646-.5842-4.9143-1.8123-9.3624-5.7781-3.4612-3.086-5.7976-6.8968-6.477-8.0624-.679-1.1641-.0725-1.7948.5112-2.3752.5231-.5216 1.1647-1.3593 1.747-2.0388.5809-.6799.7746-1.1651 1.1627-1.9417.3885-.777.1943-1.4569-.0967-2.0392-.2914-.5823-2.5538-6.3396-3.5891-8.6418Z" />
                              </svg>
                            </a>
                          ) : (
                            <span className="admin-cell-muted" title="Sin teléfono">-</span>
                          )}
                        </td>
                        <td>
                          <div 
                            className="admin-checkbox-cell" 
                            title={isPaid ? "Pago confirmado" : "Pendiente de pago"}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isPaid}
                              onChange={(event) => {
                                const isChecked = event.target.checked;
                                if (!isChecked && ["En preparacion", "Despachado", "Entregado"].includes(order.status)) {
                                  const confirm = window.confirm(
                                    `El pedido ya está en estado "${order.status}". ¿Seguro que querés volverlo a Pendiente de Pago?`
                                  );
                                  if (!confirm) return;
                                }
                                handleStatusChange(
                                  order.number,
                                  isChecked ? "Pago confirmado" : "Pendiente de pago"
                                );
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
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

          <div className="admin-order-actions-bar" style={{ display: "flex", gap: "10px", margin: "16px 0", flexWrap: "wrap", borderBottom: "1px solid #efe7e1", paddingBottom: "16px" }}>
            {selectedOrder.status === "Pendiente de pago" && (
              <>
                <button
                  type="button"
                  className="admin-action-btn primary"
                  onClick={() => handleStatusChange(selectedOrder.number, "Pago confirmado")}
                >
                  Confirmar Pago
                </button>
                <button
                  type="button"
                  className="admin-action-btn secondary"
                  onClick={() => handleStatusChange(selectedOrder.number, "Vencido")}
                >
                  Marcar Vencido
                </button>
                <button
                  type="button"
                  className="admin-action-btn danger"
                  onClick={() => {
                    if (window.confirm("¿Seguro que querés cancelar este pedido?")) {
                      handleStatusChange(selectedOrder.number, "Cancelado");
                    }
                  }}
                >
                  Cancelar Pedido
                </button>
              </>
            )}
            {selectedOrder.status === "Pago confirmado" && (
              <>
                <button
                  type="button"
                  className="admin-action-btn primary"
                  onClick={() => handleStatusChange(selectedOrder.number, "En preparacion")}
                >
                  Comenzar Preparación
                </button>
                <button
                  type="button"
                  className="admin-action-btn danger"
                  onClick={() => {
                    if (window.confirm("¿Seguro que querés cancelar este pedido?")) {
                      handleStatusChange(selectedOrder.number, "Cancelado");
                    }
                  }}
                >
                  Cancelar Pedido
                </button>
              </>
            )}
            {selectedOrder.status === "En preparacion" && (
              <>
                <button
                  type="button"
                  className="admin-action-btn primary"
                  onClick={() => handleStatusChange(selectedOrder.number, "Despachado")}
                >
                  Marcar Despachado
                </button>
                <button
                  type="button"
                  className="admin-action-btn danger"
                  onClick={() => {
                    if (window.confirm("¿Seguro que querés cancelar este pedido?")) {
                      handleStatusChange(selectedOrder.number, "Cancelado");
                    }
                  }}
                >
                  Cancelar Pedido
                </button>
              </>
            )}
            {selectedOrder.status === "Despachado" && (
              <>
                <button
                  type="button"
                  className="admin-action-btn primary"
                  onClick={() => handleStatusChange(selectedOrder.number, "Entregado")}
                >
                  Marcar Entregado
                </button>
                <button
                  type="button"
                  className="admin-action-btn danger"
                  onClick={() => {
                    if (window.confirm("¿Seguro que querés cancelar este pedido?")) {
                      handleStatusChange(selectedOrder.number, "Cancelado");
                    }
                  }}
                >
                  Cancelar Pedido
                </button>
              </>
            )}
            {(selectedOrder.status === "Cancelado" || selectedOrder.status === "Vencido") && (
              <button
                type="button"
                className="admin-action-btn secondary"
                onClick={() => handleStatusChange(selectedOrder.number, "Pendiente de pago")}
              >
                Reabrir Pedido
              </button>
            )}
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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="18" height="18">
                    <path fill="#25D366" d="M3.20676 47.591c-.00237 7.924 2.06817 15.6613 6.00506 22.4808l-6.38174 23.301 23.84542-6.2524c6.5694 3.5806 13.9665 5.4706 21.4944 5.4725h.0199c24.7897 0 44.9692-20.1724 44.9796-44.9664.0048-12.0148-4.6698-23.3123-13.1629-31.812C71.5149 7.3153 60.2212 2.63217 48.1879 2.62695 23.3953 2.62695 3.21718 22.798 3.20676 47.591Z" />
                    <path fill="#ffffff" d="M1.60084 47.5769C1.598 55.7861 3.74293 63.8001 7.82006 70.8637L1.20947 95l24.70063-6.4765c6.8058 3.7109 14.4683 5.6672 22.2657 5.6701h.0199c25.6791 0 46.5836-20.8979 46.5945-46.5793.0042-12.4465-4.8386-24.15-13.6349-32.9544C72.3577 5.85655 60.6598 1.00521 48.1957 1 22.5119 1 1.61126 21.8945 1.60084 47.5769ZM16.3103 69.6474l-.9221-1.4641c-3.8772-6.1647-5.92355-13.2884-5.92071-20.6036C9.47603 26.2337 26.8483 8.86713 48.2104 8.86713 58.5551 8.8714 68.2777 12.904 75.59 20.221c7.3123 7.3175 11.3359 17.0448 11.333 27.3905-.0095 21.3465-17.3822 38.7154-38.7273 38.7154h-.0151c-6.9503-.0038-13.7666-1.8701-19.7114-5.3971l-1.4148-.8392-14.6578 3.8431 3.9137-14.2863Z" />
                    <path fill="#ffffff" d="M36.55 28.1053c-.8723-1.9389-1.79-1.9777-2.6197-2.0118-.6789-.0289-1.4555-.0271-2.2311-.0271-.7766 0-2.0379.2919-3.1044 1.4565-1.0675 1.1651-4.0753 3.9815-4.0753 9.7093 0 5.7284 4.1724 11.2634 4.7538 12.041.5823.7761 8.0542 12.9065 19.8876 17.5731 9.8349 3.8781 11.8363 3.1068 13.9708 2.9125 2.1345-.1938 6.8882-2.8154 7.8581-5.5341.9704-2.7182.9704-5.0484.6795-5.535-.291-.4852-1.0675-.7766-2.2317-1.3585-1.1646-.5823-6.8882-3.3991-7.9552-3.7876-1.0675-.388-1.8436-.5818-2.6202.5837-.7761 1.1642-3.0059 3.7858-3.6853 4.5624-.679.778-1.3584.8751-2.5226.2928-1.1646-.5842-4.9143-1.8123-9.3624-5.7781-3.4612-3.086-5.7976-6.8968-6.477-8.0624-.679-1.1641-.0725-1.7948.5112-2.3752.5231-.5216 1.1647-1.3593 1.747-2.0388.5809-.6799.7746-1.1651 1.1627-1.9417.3885-.777.1943-1.4569-.0967-2.0392-.2914-.5823-2.5538-6.3396-3.5891-8.6418Z" />
                  </svg>
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

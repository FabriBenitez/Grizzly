import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import OrderStatusBadge from "../components/ui/OrderStatusBadge";
import { ORDER_STATUSES } from "../data/constants";
import { findOrderByNumberAndPhone, updateOrderStatus } from "../utils/orders";
import { formatCompactDate, formatCurrency } from "../utils/currency";

function normalizeOrderInput(value) {
  const numeric = String(value || "").replace(/\D/g, "");
  if (!numeric) {
    return "";
  }
  return numeric.padStart(6, "0");
}

function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("pedido") || "");
  const [phone, setPhone] = useState(searchParams.get("telefono") || "");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const timeline = useMemo(() => {
    if (!order) {
      return [];
    }

    const reachedStatuses = new Set(
      (order.statusHistory || []).map((entry) => entry.status).concat(order.status),
    );

    return ORDER_STATUSES.map((status) => ({
      status,
      reached: reachedStatuses.has(status),
      current: status === order.status,
    }));
  }, [order]);

  const runSearch = (rawOrder, rawPhone) => {
    const normalizedOrder = normalizeOrderInput(rawOrder);
    if (!normalizedOrder) {
      setError("Ingresa un numero de pedido.");
      setOrder(null);
      return;
    }

    const found = findOrderByNumberAndPhone(normalizedOrder, rawPhone || "");
    if (!found) {
      setError("No encontramos un pedido con esos datos.");
      setOrder(null);
      return;
    }

    setError("");
    setOrder(found);
    setOrderNumber(normalizedOrder);
  };

  useEffect(() => {
    if (searchParams.get("pedido")) {
      runSearch(searchParams.get("pedido"), searchParams.get("telefono") || "");
    }
  }, [searchParams]);

  const handleSearch = (event) => {
    event.preventDefault();
    runSearch(orderNumber, phone);
  };

  const canCancel =
    order &&
    !["Pago confirmado", "En preparacion", "Despachado", "Entregado", "Cancelado", "Vencido"].includes(
      order.status,
    );

  const cancelOrder = () => {
    if (!order) {
      return;
    }

    const updated = updateOrderStatus(order.number, "Cancelado");
    if (updated) {
      setOrder(updated);
    }
  };

  return (
    <div className="container section-space track-page">
      <header className="section-title">
        <p>Seguimiento</p>
        <h1>Segui tu pedido</h1>
        <span>Consulta estado de pago, preparacion y entrega con numero de pedido.</span>
      </header>

      <form className="track-form" onSubmit={handleSearch}>
        <label>
          Numero de pedido
          <input
            type="text"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="Ej: 000123"
          />
        </label>
        <label>
          Telefono
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Opcional para validar"
          />
        </label>
        <button type="submit" className="btn-primary">
          Consultar
        </button>
      </form>

      {error && <p className="feedback-error">{error}</p>}

      {order && (
        <section className="track-result">
          <div className="track-header">
            <div>
              <h2>Pedido #{order.number}</h2>
              <p>Creado el {formatCompactDate(order.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="track-grid">
            <article>
              <h3>Cliente</h3>
              <p>{order.customer.name}</p>
              <p>{order.customer.phone}</p>
              {order.customer.email && <p>{order.customer.email}</p>}
            </article>
            <article>
              <h3>Entrega</h3>
              <p>{order.delivery.type === "envio" ? "Envio a domicilio" : "Retiro presencial"}</p>
              {order.delivery.type === "envio" ? (
                <>
                  <p>{order.delivery.address}</p>
                  <p>
                    {order.delivery.locality} - {order.delivery.postalCode}
                  </p>
                </>
              ) : (
                <>
                  <p>Retira: {order.delivery.pickupPerson}</p>
                  <p>Franja: {order.delivery.pickupWindow || "A coordinar por WhatsApp"}</p>
                </>
              )}
            </article>
            <article>
              <h3>Pago</h3>
              <p>Metodo: {order.paymentMethod}</p>
              <p>Total: {formatCurrency(order.totals.total)}</p>
              <p>Envio: {formatCurrency(order.totals.shipping)}</p>
            </article>
          </div>

          <div className="track-products">
            <h3>Productos del pedido</h3>
            <ul>
              {order.items.map((item) => (
                <li key={`${order.number}-${item.id}`}>
                  <span>
                    {item.name} x{item.quantity}
                  </span>
                  <b>{formatCurrency(item.subtotal)}</b>
                </li>
              ))}
            </ul>
          </div>

          <div className="timeline">
            <h3>Estado comercial</h3>
            <ol>
              {timeline.map((step) => (
                <li
                  key={step.status}
                  className={`${step.reached ? "reached" : ""} ${step.current ? "current" : ""}`}
                >
                  {step.status}
                </li>
              ))}
            </ol>
          </div>

          {canCancel && (
            <button type="button" className="btn-outline" onClick={cancelOrder}>
              Cancelar pedido
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export default TrackOrderPage;

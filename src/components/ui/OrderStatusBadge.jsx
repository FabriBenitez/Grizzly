const STATUS_CLASS = {
  "Pendiente de pago": "payment",
  "Pago confirmado": "confirmed",
  "En preparacion": "preparing",
  Despachado: "shipped",
  Entregado: "delivered",
  Cancelado: "cancelled",
  Vencido: "expired",
};

function OrderStatusBadge({ status }) {
  const className = STATUS_CLASS[status] || "pending";
  return <span className={`status-badge ${className}`}>{status}</span>;
}

export default OrderStatusBadge;

const STATUS_CLASS = {
  "Pendiente de confirmación": "pending",
  "Pendiente de pago": "payment",
  "Pago informado": "payment-info",
  "Pago confirmado": "confirmed",
  "En preparación": "preparing",
  "Despachado / enviado": "shipped",
  Entregado: "delivered",
  Cancelado: "cancelled",
  Vencido: "expired",
};

function OrderStatusBadge({ status }) {
  const className = STATUS_CLASS[status] || "pending";
  return <span className={`status-badge ${className}`}>{status}</span>;
}

export default OrderStatusBadge;

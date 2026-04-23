import { ORDER_STATUSES } from "../data/constants";
import { demoOrders } from "../data/adminDemo";

export const ADMIN_WORKFLOW_STEPS = [
  {
    status: "Pendiente de confirmación",
    action: "Validar stock y confirmar disponibilidad al cliente.",
    stockImpact: "Sin reserva",
  },
  {
    status: "Pendiente de pago",
    action: "Enviar alias/CBU/link de pago y reservar unidades.",
    stockImpact: "Reserva temporal",
  },
  {
    status: "Pago informado",
    action: "Revisar comprobante enviado por cliente.",
    stockImpact: "Reserva temporal",
  },
  {
    status: "Pago confirmado",
    action: "Confirmar ingreso y descontar stock definitivo.",
    stockImpact: "Descuento definitivo",
  },
  {
    status: "En preparación",
    action: "Armar pedido y preparar despacho o retiro.",
    stockImpact: "Ya descontado",
  },
  {
    status: "Despachado / enviado",
    action: "Marcar salida y compartir seguimiento con cliente.",
    stockImpact: "Ya descontado",
  },
  {
    status: "Entregado",
    action: "Cerrar operación comercial y postventa.",
    stockImpact: "Finalizado",
  },
  {
    status: "Cancelado",
    action: "Cancelar pedido antes de entrega y liberar reserva si aplica.",
    stockImpact: "Reponer reserva",
  },
  {
    status: "Vencido",
    action: "Aplicar vencimiento por falta de pago (24h).",
    stockImpact: "Liberar reserva",
  },
];

export const ADMIN_FUNCTIONALITIES = [
  {
    area: "Pedidos",
    points: [
      "Ver listado completo y filtrar por estado.",
      "Abrir detalle de compra y datos de entrega.",
      "Actualizar estado comercial en cada etapa.",
      "Registrar observaciones operativas.",
    ],
  },
  {
    area: "Pagos",
    points: [
      "Enviar alias / CBU / link de pago al cliente.",
      "Marcar pendiente, informado, confirmado o rechazado.",
      "Verificar comprobantes y monto esperado.",
      "Definir vencimiento para liberar reservas.",
    ],
  },
  {
    area: "Productos",
    points: [
      "Alta / baja / modificación de productos.",
      "Editar precio regular y promocional.",
      "Gestionar imágenes, marcas y categorías.",
      "Definir producto activo e item destacado.",
    ],
  },
  {
    area: "Promociones",
    points: [
      "Crear promo por porcentaje, monto fijo, combo o 2x1.",
      "Asignar por categoría, marca o producto puntual.",
      "Configurar fecha inicio/fin y prioridad.",
      "Activar/desactivar promociones vigentes.",
    ],
  },
  {
    area: "Clientes",
    points: [
      "Ver datos de contacto y direcciones.",
      "Consultar historial de compras.",
      "Detectar clientes frecuentes.",
      "Identificar pedidos pendientes de pago.",
    ],
  },
  {
    area: "Stock y reportes",
    points: [
      "Definir umbral global de stock bajo para toda la tienda.",
      "Detectar productos en alerta de reposición.",
      "Analizar ventas por período y top productos.",
      "Monitorear cancelados y vencidos.",
    ],
  },
];

export function getOrdersSource(realOrders) {
  const useDemoData = !realOrders.length;
  return {
    useDemoData,
    orders: useDemoData ? demoOrders : realOrders,
  };
}

export function updateOrderStatusInMemory(orders, orderNumber, nextStatus) {
  if (!ORDER_STATUSES.includes(nextStatus)) {
    return orders;
  }

  return orders.map((order) => {
    if (order.number !== orderNumber || order.status === nextStatus) {
      return order;
    }

    return {
      ...order,
      status: nextStatus,
      statusHistory: [
        ...(order.statusHistory || []),
        { status: nextStatus, timestamp: new Date().toISOString() },
      ],
    };
  });
}

export function getAdminMetrics(orders) {
  const totalOrders = orders.length;
  const pendingConfirmation = orders.filter(
    (order) => order.status === "Pendiente de confirmación",
  ).length;
  const pendingPayment = orders.filter((order) => order.status === "Pendiente de pago").length;
  const paymentReported = orders.filter((order) => order.status === "Pago informado").length;
  const inPreparation = orders.filter((order) => order.status === "En preparación").length;
  const delivered = orders.filter((order) => order.status === "Entregado").length;
  const cancelled = orders.filter(
    (order) => order.status === "Cancelado" || order.status === "Vencido",
  ).length;

  const confirmedRevenue = orders
    .filter((order) => order.status === "Pago confirmado" || order.status === "Entregado")
    .reduce((acc, order) => acc + (order.totals?.total || 0), 0);

  return {
    totalOrders,
    pendingConfirmation,
    pendingPayment,
    paymentReported,
    inPreparation,
    delivered,
    cancelled,
    confirmedRevenue,
  };
}

export function getStatusDistribution(orders) {
  return ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  }));
}

export function getTopProductsFromOrders(orders, limit = 8) {
  const map = new Map();
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const current = map.get(item.id) || {
        id: item.id,
        name: item.name,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity || 0;
      current.revenue += item.subtotal || 0;
      map.set(item.id, current);
    });
  });

  return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}

export function getPaymentStageOrders(orders) {
  const paymentStages = [
    "Pendiente de pago",
    "Pago informado",
    "Pago confirmado",
    "Cancelado",
    "Vencido",
  ];

  return orders.filter((order) => paymentStages.includes(order.status));
}

import { ORDER_STATUSES } from "../data/constants";
import { demoOrders } from "../data/adminDemo";
import { normalizeOrderRecord } from "./orders";

export const CONFIRMED_ORDER_STATUSES = [
  "Pago confirmado",
  "En preparacion",
  "Despachado",
  "Entregado",
];

export const ADMIN_WORKFLOW_STEPS = [
  {
    status: "Pendiente de pago",
    action: "Enviar datos de cobro y dejar la reserva operativa lista.",
    stockImpact: "Reserva temporal",
  },
  {
    status: "Pago confirmado",
    action: "Validar cobro y pasar el pedido a proceso interno.",
    stockImpact: "Descuento definitivo",
  },
  {
    status: "En preparacion",
    action: "Armar pedido y preparar despacho o retiro.",
    stockImpact: "Ya descontado",
  },
  {
    status: "Despachado",
    action: "Marcar salida y compartir seguimiento con cliente.",
    stockImpact: "Ya descontado",
  },
  {
    status: "Entregado",
    action: "Cerrar operacion comercial y postventa.",
    stockImpact: "Finalizado",
  },
  {
    status: "Cancelado",
    action: "Cancelar pedido antes de entrega y liberar reserva si aplica.",
    stockImpact: "Reponer reserva",
  },
  {
    status: "Vencido",
    action: "Aplicar vencimiento por falta de pago y liberar reserva.",
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
      "Confirmar pagos y registrar vencimientos o cancelaciones.",
      "Verificar comprobantes y monto esperado.",
      "Definir reglas para liberar reservas.",
    ],
  },
  {
    area: "Productos",
    points: [
      "Alta / baja / modificacion de productos.",
      "Editar precio regular y promocional.",
      "Gestionar imagenes, marcas y categorias.",
      "Definir producto activo e item destacado.",
    ],
  },
  {
    area: "Promociones",
    points: [
      "Crear promos 2x1 o 3x2 por categoria, marca o producto.",
      "Asignar por categoria, marca o producto puntual.",
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
      "Detectar productos en alerta de reposicion.",
      "Analizar ventas por periodo y top productos.",
      "Monitorear cancelados y vencidos.",
    ],
  },
];

export function getOrdersSource(realOrders) {
  const useDemoData = !realOrders.length;
  return {
    useDemoData,
    orders: (useDemoData ? demoOrders : realOrders).map((order) => normalizeOrderRecord(order)),
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
  const pendingPayment = orders.filter((order) => order.status === "Pendiente de pago").length;
  const confirmedPayment = orders.filter((order) => order.status === "Pago confirmado").length;
  const inPreparation = orders.filter((order) => order.status === "En preparacion").length;
  const dispatched = orders.filter((order) => order.status === "Despachado").length;
  const delivered = orders.filter((order) => order.status === "Entregado").length;
  const cancelled = orders.filter(
    (order) => order.status === "Cancelado" || order.status === "Vencido",
  ).length;

  const confirmedRevenue = orders
    .filter((order) => CONFIRMED_ORDER_STATUSES.includes(order.status))
    .reduce((acc, order) => acc + (order.totals?.total || 0), 0);

  return {
    totalOrders,
    pendingPayment,
    confirmedPayment,
    inPreparation,
    dispatched,
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

  orders
    .filter((order) => CONFIRMED_ORDER_STATUSES.includes(order.status))
    .forEach((order) => {
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
  const paymentStages = ["Pendiente de pago", "Pago confirmado", "Cancelado", "Vencido"];
  return orders.filter((order) => paymentStages.includes(order.status));
}

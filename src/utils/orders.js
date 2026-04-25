import { ORDER_STATUSES } from "../data/constants";

const ORDER_STORAGE_KEY = "grizzly_orders";
const LEGACY_STATUS_MAP = {
  "Pendiente de confirmacion": "Pendiente de pago",
  "Pendiente de confirmación": "Pendiente de pago",
  "Pago informado": "Pendiente de pago",
  "En preparación": "En preparacion",
  "Despachado / enviado": "Despachado",
};

export function normalizeOrderStatus(status) {
  const normalized = LEGACY_STATUS_MAP[status] || status;
  return ORDER_STATUSES.includes(normalized) ? normalized : ORDER_STATUSES[0];
}

function normalizeStatusHistory(history = [], fallbackStatus) {
  const normalizedEntries = (history || [])
    .map((entry) => ({
      ...entry,
      status: normalizeOrderStatus(entry.status),
    }))
    .filter((entry, index, array) => index === 0 || entry.status !== array[index - 1].status);

  if (!normalizedEntries.length) {
    return [
      {
        status: normalizeOrderStatus(fallbackStatus),
        timestamp: new Date().toISOString(),
      },
    ];
  }

  return normalizedEntries;
}

export function normalizeOrderRecord(order) {
  const normalizedStatus = normalizeOrderStatus(order.status);
  const normalizedHistory = normalizeStatusHistory(order.statusHistory, normalizedStatus);
  const latestHistoryStatus = normalizedHistory[normalizedHistory.length - 1]?.status;

  return {
    ...order,
    status: latestHistoryStatus || normalizedStatus,
    statusHistory:
      latestHistoryStatus === normalizedStatus
        ? normalizedHistory
        : [
            ...normalizedHistory,
            {
              status: normalizedStatus,
              timestamp: new Date().toISOString(),
            },
          ],
  };
}

function readStorage() {
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    return raw ? JSON.parse(raw).map(normalizeOrderRecord) : [];
  } catch {
    return [];
  }
}

function writeStorage(orders) {
  window.localStorage.setItem(
    ORDER_STORAGE_KEY,
    JSON.stringify(orders.map((order) => normalizeOrderRecord(order))),
  );
}

function nextOrderNumber(currentOrders) {
  const maxNumeric = currentOrders.reduce((max, order) => {
    const numeric = Number(String(order.number).replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);

  return String(maxNumeric + 1).padStart(6, "0");
}

export function getOrders() {
  return readStorage().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function createOrder(orderInput) {
  const orders = readStorage();
  const order = {
    ...orderInput,
    number: nextOrderNumber(orders),
    status: ORDER_STATUSES[0],
    createdAt: new Date().toISOString(),
    statusHistory: [
      {
        status: ORDER_STATUSES[0],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  writeStorage([...orders, order]);
  return order;
}

export function updateOrderStatus(orderNumber, nextStatus) {
  if (!ORDER_STATUSES.includes(nextStatus)) {
    return null;
  }

  const orders = readStorage();
  const updatedOrders = orders.map((order) => {
    if (order.number !== orderNumber) {
      return order;
    }

    if (order.status === nextStatus) {
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

  writeStorage(updatedOrders);
  return updatedOrders.find((order) => order.number === orderNumber) || null;
}

export function findOrderByNumberAndPhone(orderNumber, phone) {
  const normalizedPhone = phone.replace(/\D/g, "");

  const found = readStorage().find((order) => {
    const matchesOrder = order.number === orderNumber;
    const orderPhone = String(order.customer?.phone || "").replace(/\D/g, "");
    const matchesPhone = !normalizedPhone || orderPhone.endsWith(normalizedPhone);
    return matchesOrder && matchesPhone;
  });

  return found ? normalizeOrderRecord(found) : null;
}

export function getOrdersByPhone(phone) {
  const normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone) {
    return [];
  }

  return readStorage().filter((order) =>
    String(order.customer?.phone || "")
      .replace(/\D/g, "")
      .endsWith(normalizedPhone),
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSupabase } from "../shared/auth/AuthSupabaseProvider";
import { getOrders, updateOrderStatus as updateLocalOrderStatus } from "../utils/orders";
import { getOrdersSource, updateOrderStatusInMemory } from "../utils/admin";
import { fetchAdminOrdersFromSupabase, updateRemoteOrderStatus } from "../utils/orders.remote";

function loadLocalOrders() {
  const source = getOrdersSource(getOrders());
  return {
    orders: source.orders,
    useDemoData: source.useDemoData,
  };
}

export function useAdminOrdersData() {
  const { cargando, esAdmin, puedeIniciarSesion } = useAuthSupabase();
  const [orders, setOrders] = useState([]);
  const [useDemoData, setUseDemoData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    if (cargando) {
      return;
    }

    if (!puedeIniciarSesion || !esAdmin) {
      const local = loadLocalOrders();
      setOrders(local.orders);
      setUseDemoData(local.useDemoData);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);

    try {
      const remoteOrders = await fetchAdminOrdersFromSupabase();

      if (remoteOrders.length) {
        setOrders(remoteOrders);
        setUseDemoData(false);
      } else {
        const local = loadLocalOrders();
        setOrders(local.orders);
        setUseDemoData(local.useDemoData);
      }

      setError("");
    } catch (loadError) {
      const local = loadLocalOrders();
      setOrders(local.orders);
      setUseDemoData(local.useDemoData);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar los pedidos reales. Mostrando fallback local.",
      );
    } finally {
      setLoading(false);
    }
  }, [cargando, esAdmin, puedeIniciarSesion]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateStatus = useCallback(
    async (orderNumber, nextStatus) => {
      const currentOrder = orders.find((order) => order.number === orderNumber);

      if (!currentOrder) {
        return;
      }

      if (useDemoData || !puedeIniciarSesion || !esAdmin) {
        if (useDemoData) {
          setOrders((prev) => updateOrderStatusInMemory(prev, orderNumber, nextStatus));
        } else {
          updateLocalOrderStatus(orderNumber, nextStatus);
          const local = loadLocalOrders();
          setOrders(local.orders);
          setUseDemoData(local.useDemoData);
        }
        return;
      }

      try {
        await updateRemoteOrderStatus(currentOrder, nextStatus);
        setError("");
        await loadOrders();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "No pudimos actualizar el estado del pedido.",
        );
      }
    },
    [esAdmin, loadOrders, orders, puedeIniciarSesion, useDemoData],
  );

  return useMemo(
    () => ({
      orders,
      useDemoData,
      loading,
      error,
      reload: loadOrders,
      updateStatus,
    }),
    [error, loadOrders, loading, orders, updateStatus, useDemoData],
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSupabase } from "../shared/auth/AuthSupabaseProvider";
import { fetchAdminOrdersFromSupabase, updateRemoteOrderStatus } from "../utils/orders.remote";

export function useAdminOrdersData() {
  const { cargando, esAdmin, puedeIniciarSesion } = useAuthSupabase();
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    if (cargando) {
      return;
    }

    if (!puedeIniciarSesion || !esAdmin) {
      setOrders([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);

    try {
      const remoteOrders = await fetchAdminOrdersFromSupabase();

      setOrders(remoteOrders);

      setError("");
    } catch (loadError) {
      setOrders([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar los pedidos.",
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

      if (!puedeIniciarSesion || !esAdmin) {
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
    [esAdmin, loadOrders, orders, puedeIniciarSesion],
  );

  return useMemo(
    () => ({
      orders,
      useDemoData: false,
      loading,
      error,
      reload: loadOrders,
      updateStatus,
    }),
    [error, loadOrders, loading, orders, updateStatus],
  );
}

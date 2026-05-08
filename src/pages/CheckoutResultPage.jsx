import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { createCheckoutPayment, fetchPublicOrderTracking } from "../utils/orders.remote";
import { formatCurrency } from "../utils/currency";
import "./checkout.css";

const LAST_ORDER_STORAGE_KEY = "grizzly_last_order";

function readLastOrder() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(LAST_ORDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getScreenTone(mode, paymentStatus) {
  if (mode === "manual") {
    return {
      key: "manual",
      icon: CreditCard,
      title: "Pedido generado",
      description:
        "Registramos tu pedido con pago manual pendiente. Puedes compartir el numero de pedido y seguir el estado desde esta pagina.",
    };
  }

  if (paymentStatus === "approved") {
    return {
      key: "approved",
      icon: CheckCircle2,
      title: "Pago aprobado",
      description:
        "El pago se proceso correctamente. Tu pedido ya quedo registrado y el panel admin va a reflejar esta aprobacion.",
    };
  }

  if (paymentStatus === "pending" || paymentStatus === "in_process") {
    return {
      key: "pending",
      icon: Clock3,
      title: "Pago pendiente",
      description:
        "Mercado Pago informo que el pago sigue en proceso o esperando acreditacion. Puedes volver a esta pagina para seguirlo.",
    };
  }

  return {
    key: "failed",
    icon: AlertTriangle,
    title: "Pago no completado",
    description:
      "El pedido quedo creado, pero el pago no se aprobo. Puedes reintentar el checkout sin volver a armar el carrito.",
  };
}

function CheckoutResultPage() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const lastOrder = useMemo(() => readLastOrder(), []);

  const mode = searchParams.get("modo") || "";
  const paymentStatus =
    searchParams.get("status") ||
    searchParams.get("collection_status") ||
    searchParams.get("payment_status") ||
    "";
  const orderNumber =
    searchParams.get("pedido") ||
    searchParams.get("external_reference") ||
    lastOrder?.orderNumber ||
    "";
  const phone = searchParams.get("telefono") || lastOrder?.phone || "";
  const tone = useMemo(() => getScreenTone(mode, paymentStatus), [mode, paymentStatus]);

  useEffect(() => {
    if (!orderNumber) {
      return;
    }

    let active = true;
    setLoadingOrder(true);

    fetchPublicOrderTracking(orderNumber, phone)
      .then((trackedOrder) => {
        if (!active) {
          return;
        }

        setOrder(trackedOrder);
        setError("");
      })
      .catch((trackingError) => {
        if (!active) {
          return;
        }

        setError(
          trackingError instanceof Error
            ? trackingError.message
            : "No pudimos cargar el pedido asociado al pago.",
        );
      })
      .finally(() => {
        if (active) {
          setLoadingOrder(false);
        }
      });

    return () => {
      active = false;
    };
  }, [orderNumber, phone]);

  const handleRetry = async () => {
    if (!orderNumber) {
      return;
    }

    setRetrying(true);
    setError("");

    try {
      const result = await createCheckoutPayment({
        orderNumber,
        paymentMethod: "mercadopago",
      });

      if (!result?.initPoint) {
        throw new Error("Mercado Pago no devolvio una URL valida para reintentar.");
      }

      window.location.assign(result.initPoint);
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "No pudimos reintentar el pago en este momento.",
      );
      setRetrying(false);
    }
  };

  const trackingPath = orderNumber
    ? `/seguimiento?pedido=${encodeURIComponent(orderNumber)}${
        phone ? `&telefono=${encodeURIComponent(phone)}` : ""
      }`
    : "/seguimiento";

  const ToneIcon = tone.icon;

  return (
    <div className="checkout-container">
      <div className="container section-space">
        <section className={`checkout-result-card checkout-result-${tone.key}`}>
          <div className="checkout-result-hero">
            <div className="checkout-result-icon">
              <ToneIcon size={28} />
            </div>
            <div>
              <p className="kicker">Estado del checkout</p>
              <h1>{tone.title}</h1>
              <span className="subtitle">{tone.description}</span>
            </div>
          </div>

          <div className="checkout-result-actions">
            <Link to={trackingPath} className="btn-primary">
              Seguir pedido
            </Link>

            {tone.key === "failed" && (
              <button
                type="button"
                className="btn-outline"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? (
                  <>
                    <LoaderCircle size={18} className="spin" />
                    Reintentando...
                  </>
                ) : (
                  <>
                    <RotateCcw size={18} />
                    Reintentar pago
                  </>
                )}
              </button>
            )}

            <Link to="/catalogo" className="btn-outline">
              Volver al catalogo
            </Link>
          </div>

          {error && <p className="error-alert">{error}</p>}

          {loadingOrder ? (
            <div className="checkout-result-loading">Cargando resumen del pedido...</div>
          ) : order ? (
            <div className="checkout-result-summary">
              <article className="checkout-result-box">
                <span className="checkout-result-label">Pedido</span>
                <strong>#{order.number}</strong>
                <small>{order.customer.name}</small>
              </article>
              <article className="checkout-result-box">
                <span className="checkout-result-label">Total</span>
                <strong>{formatCurrency(order.totals.total)}</strong>
                <small>{order.paymentMethod}</small>
              </article>
              <article className="checkout-result-box">
                <span className="checkout-result-label">Estado actual</span>
                <strong>{order.status}</strong>
                <small>{order.delivery.type === "envio" ? "Envio" : "Retiro"}</small>
              </article>
            </div>
          ) : (
            <div className="checkout-result-loading">
              {orderNumber
                ? `Pedido detectado: ${orderNumber}.`
                : "No encontramos un pedido asociado al retorno del checkout."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CheckoutResultPage;

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatCurrency } from "../utils/currency";
import { getEffectivePrice } from "../utils/catalog";
import { determinarTipoEnvioPorDireccion } from "../utils/delivery";
import {
  sanitizeLettersOnly,
  sanitizePhoneNumber,
  sanitizePostalCode,
} from "../shared/forms/inputRules";
import { obtenerSucursalesCorreoArgentino } from "../data/branches";
import { createCheckoutPayment } from "../utils/orders.remote";
import "./checkout.css";

const PAYMENT_METHODS = [
  {
    id: "mercadopago",
    label: "Mercado Pago",
    description: "Paga online con tarjeta, saldo o dinero en cuenta.",
  },
];

const FREE_SHIPPING_THRESHOLD = 50;
const LAST_ORDER_STORAGE_KEY = "grizzly_last_order";

function FreeShippingProgress({ currentAmount }) {
  const safeAmount = Math.max(0, currentAmount || 0);
  const progress = Math.min(100, Math.round((safeAmount / FREE_SHIPPING_THRESHOLD) * 100));
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - safeAmount);
  const unlocked = remaining === 0;

  return (
    <div className={`free-shipping-card ${unlocked ? "unlocked" : ""}`}>
      <div className="free-shipping-copy">
        <Truck size={18} />
        <div>
          <strong>
            {unlocked
              ? "Ya tienes envio gratis"
              : `Te faltan ${formatCurrency(remaining)} para envio gratis`}
          </strong>
          <span>Envio gratis superando {formatCurrency(FREE_SHIPPING_THRESHOLD)}</span>
        </div>
      </div>

      <div
        className="free-shipping-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progress}
      >
        <span
          className="free-shipping-fill"
          style={{ "--free-progress": `${progress}%` }}
        />
      </div>

      <div className="free-shipping-values">
        <span>{formatCurrency(safeAmount)}</span>
        <span>{formatCurrency(FREE_SHIPPING_THRESHOLD)}</span>
      </div>
    </div>
  );
}

function CheckoutPage() {
  const { items, summary, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    locality: "",
    postalCode: "",
    paymentMethod: PAYMENT_METHODS[0]?.id || "mercadopago",
    observation: "",
  });
  const [deliveryInfo, setDeliveryInfo] = useState({
    loading: false,
    type: null,
    cost: 0,
  });
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const debounceTimer = window.setTimeout(async () => {
      if (form.address.length <= 5 || form.locality.length <= 3 || form.postalCode.length < 4) {
        setDeliveryInfo((prev) => ({ ...prev, loading: false, type: null, cost: 0 }));
        setBranches([]);
        setSelectedBranch(null);
        return;
      }

      setDeliveryInfo((prev) => ({ ...prev, loading: true }));
      const result = await determinarTipoEnvioPorDireccion(form);

      if (!result) {
        setDeliveryInfo({ loading: false, type: null, cost: 0 });
        setBranches([]);
        setSelectedBranch(null);
        return;
      }

      setDeliveryInfo({ loading: false, type: result.type, cost: result.cost });

      if (result.type === "correo") {
        const branchList = await obtenerSucursalesCorreoArgentino(form);
        setBranches(branchList);
      } else {
        setBranches([]);
        setSelectedBranch(null);
      }
    }, 800);

    return () => window.clearTimeout(debounceTimer);
  }, [form.address, form.locality, form.postalCode]);

  const freeShippingBase = summary.total;
  const hasFreeShipping = freeShippingBase >= FREE_SHIPPING_THRESHOLD;

  const shippingCost = useMemo(() => {
    if (hasFreeShipping) {
      return 0;
    }

    return deliveryInfo.cost;
  }, [deliveryInfo.cost, hasFreeShipping]);

  const total = summary.total + shippingCost;

  const setField = (field, value) => {
    let nextValue = value;

    if (field === "name" || field === "locality") {
      nextValue = sanitizeLettersOnly(value);
    }

    if (field === "phone") {
      nextValue = sanitizePhoneNumber(value);
    }

    if (field === "postalCode") {
      nextValue = sanitizePostalCode(value);
    }

    setForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }));
  };

  const validate = () => {
    if (!items.length) {
      return "Tu carrito esta vacio.";
    }

    if (!form.name.trim() || !form.phone.trim()) {
      return "Nombre y telefono son obligatorios.";
    }

    if (!form.email.trim()) {
      return "El email es obligatorio para continuar con el pago.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Ingresa un email valido.";
    }

    if (!form.address.trim() || !form.locality.trim() || !form.postalCode.trim()) {
      return "Completa los datos de domicilio.";
    }

    if (!deliveryInfo.type) {
      return "Aun no pudimos calcular tu tipo de envio.";
    }

    if (deliveryInfo.type === "correo" && !selectedBranch) {
      return "Selecciona una sucursal de correo.";
    }

    if (!form.paymentMethod) {
      return "Selecciona una forma de pago.";
    }

    return "";
  };

  const persistLastOrder = (orderNumber) => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      LAST_ORDER_STORAGE_KEY,
      JSON.stringify({
        orderNumber,
        phone: form.phone.trim(),
      }),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const checkoutPayload = {
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        },
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          basePrice: item.price,
          effectivePrice: getEffectivePrice(item),
          lineTotal: getEffectivePrice(item) * item.quantity,
        })),
        totals: {
          subtotal: summary.subtotal,
          discount: summary.discount,
          shipping: shippingCost,
          total,
        },
        delivery: {
          type: deliveryInfo.type,
          address: form.address.trim(),
          locality: form.locality.trim(),
          postalCode: form.postalCode.trim(),
          branch: selectedBranch,
        },
        paymentMethod: form.paymentMethod,
        observation: form.observation.trim(),
      };

      const result = await createCheckoutPayment(checkoutPayload);
      const orderNumber = result.orderNumber;

      if (!orderNumber) {
        throw new Error("El sistema no devolvio un numero de pedido valido.");
      }

      persistLastOrder(orderNumber);

      if (result.checkoutMode === "mercadopago" && result.initPoint) {
        clearCart();
        window.location.assign(result.initPoint);
        return;
      }

      if (result.checkoutMode === "manual") {
        clearCart();
        navigate(
          `/checkout/resultado?modo=manual&pedido=${encodeURIComponent(orderNumber)}&telefono=${encodeURIComponent(form.phone.trim())}`,
        );
        return;
      }

      if (result.checkoutMode === "already-approved") {
        clearCart();
        navigate(
          `/checkout/resultado?status=approved&pedido=${encodeURIComponent(orderNumber)}&telefono=${encodeURIComponent(form.phone.trim())}`,
        );
        return;
      }

      throw new Error("No pudimos determinar el siguiente paso del checkout.");
    } catch (submitError) {
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos iniciar el proceso de pago.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="checkout-container">
      <div className="container section-space">
        <header className="checkout-header">
          <p className="kicker">Proceso de compra</p>
          <h1>Finaliza tu pedido</h1>
          <span className="subtitle">
            Completa tus datos para coordinar el envio y avanzar con el pago seguro.
          </span>
        </header>

        <div className="checkout-grid">
          <aside className="checkout-sidebar">
            <div className="admin-card cart-sticky-summary">
              <div className="cart-summary-header">
                <div>
                  <span className="cart-eyebrow">Resumen</span>
                  <h3>Tu pedido</h3>
                </div>

                {!!items.length && (
                  <span className="cart-count">
                    {items.length} {items.length === 1 ? "producto" : "productos"}
                  </span>
                )}
              </div>

              {!items.length ? (
                <div className="empty-cart-box">
                  <p>Tu carrito esta vacio.</p>
                  <Link to="/catalogo" className="back-to-shop-link">
                    Volver a la tienda
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="checkout-cart-list">
                    {items.map((item) => (
                      <li key={item.id} className="checkout-cart-item">
                        <div className="cart-item-media">
                          <img src={item.image} alt={item.name} />
                        </div>

                        <div className="cart-item-main">
                          <div className="cart-item-top">
                            <h4>{item.name}</h4>

                            <button
                              type="button"
                              className="remove-item-btn"
                              onClick={() => removeItem(item.id)}
                              aria-label={`Eliminar ${item.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="cart-item-bottom">
                            <div className="qty-mini" aria-label="Cantidad del producto">
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(item.id, Math.max(1, item.quantity - 1))
                                }
                              >
                                -
                              </button>

                              <span>{item.quantity}</span>

                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>

                            <span className="item-line-total">
                              {formatCurrency(getEffectivePrice(item) * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <FreeShippingProgress currentAmount={freeShippingBase} />

                  <div className="totals-box">
                    <div className="line">
                      <span>Subtotal</span>
                      <span>{formatCurrency(summary.subtotal)}</span>
                    </div>

                    <div className="line discount">
                      <span>Descuentos</span>
                      <span>-{formatCurrency(summary.discount)}</span>
                    </div>

                    <div className="line">
                      <span>
                        Envio
                        {hasFreeShipping
                          ? " gratis"
                          : deliveryInfo.type
                            ? ` ${deliveryInfo.type === "moto" ? "moto" : "correo"}`
                            : ""}
                      </span>
                      <span>
                        {deliveryInfo.loading ? "Calculando..." : formatCurrency(shippingCost)}
                      </span>
                    </div>

                    <div className="line total">
                      <span>Total estimado</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div className="trust-badge">
                    <ShieldCheck size={16} />
                    <span>Pedido registrado con seguimiento y estados de pago sincronizados.</span>
                  </div>
                </>
              )}
            </div>
          </aside>

          <main className="checkout-steps">
            <div className="admin-card step-card">
              <div className="step-header">
                <span className="step-num">1</span>
                <div>
                  <h3>Datos de contacto</h3>
                  <p>Necesarios para identificarte y enviarte actualizaciones del pedido.</p>
                </div>
              </div>

              <div className="step-body grid-2">
                <label className="input-group">
                  Nombre completo *
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder="Ej: Juan Perez"
                    autoComplete="name"
                    inputMode="text"
                    pattern="[A-Za-zÀ-ÿ\s'-]+"
                    title="Ingresa solo letras."
                  />
                </label>

                <label className="input-group">
                  Telefono *
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    placeholder="Ej: 1123456789"
                    autoComplete="tel"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    title="Ingresa solo numeros."
                  />
                </label>

                <label className="input-group full">
                  Email *
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    placeholder="tu@email.com"
                  />
                </label>
              </div>
            </div>

            <div className="admin-card step-card">
              <div className="step-header">
                <span className="step-num">2</span>
                <div>
                  <h3>Direccion y entrega</h3>
                  <p>Ingresa tu ubicacion para detectar el metodo de envio disponible.</p>
                </div>
              </div>

              <div className="step-body">
                <div className="grid-3">
                  <label className="input-group">
                    Direccion *
                    <input
                      type="text"
                      value={form.address}
                      onChange={(event) => setField("address", event.target.value)}
                    />
                  </label>

                  <label className="input-group">
                    Localidad *
                    <input
                    type="text"
                    value={form.locality}
                    onChange={(event) => setField("locality", event.target.value)}
                    autoComplete="address-level2"
                    inputMode="text"
                    pattern="[A-Za-zÀ-ÿ\s'-]+"
                    title="Ingresa solo letras."
                  />
                </label>

                <label className="input-group">
                  C.P. *
                    <input
                    type="text"
                    value={form.postalCode}
                    onChange={(event) => setField("postalCode", event.target.value)}
                    autoComplete="postal-code"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    title="Ingresa solo numeros."
                  />
                </label>
                </div>

                {deliveryInfo.loading && (
                  <div className="delivery-status loading">Calculando tipo de envio...</div>
                )}

                {deliveryInfo.type === "moto" && (
                  <div className="delivery-result-card moto">
                    <Truck className="icon" />
                    <div>
                      <strong>Moto mensajeria disponible</strong>
                      <p>Estas dentro de la zona de entrega rapida por moto.</p>
                    </div>
                  </div>
                )}

                {deliveryInfo.type === "correo" && (
                  <div className="correo-selection-area">
                    <div className="correo-selection-head">
                      <div>
                        <span className="correo-selection-kicker">Retiro por sucursal</span>
                        <h4>Elige donde quieres recibir tu paquete</h4>
                      </div>
                      <span className="correo-selection-count">
                        {branches.length} {branches.length === 1 ? "sucursal disponible" : "sucursales disponibles"}
                      </span>
                    </div>

                    <div className="correo-selection-layout">
                      <aside className="correo-selection-side">
                        <div className="delivery-result-card correo correo-summary-card">
                          <MapPin className="icon" />
                          <div>
                            <strong>Envio por Correo Argentino</strong>
                            <p>Selecciona una sucursal cercana para retirar el paquete con seguimiento.</p>
                          </div>
                        </div>

                        <div className="correo-selection-benefits">
                          <span>Retiro en sucursal segun tu zona</span>
                          <span>Seguimiento del pedido incluido</span>
                          <span>Confirmacion clara del punto elegido</span>
                        </div>

                        {selectedBranch ? (
                          <div className="correo-selected-branch-card">
                            <span className="correo-selected-kicker">Sucursal elegida</span>
                            <strong>{selectedBranch.name}</strong>
                            <p>
                              {selectedBranch.address}, {selectedBranch.city}
                            </p>
                            <small>{selectedBranch.hours}</small>
                          </div>
                        ) : (
                          <div className="correo-selected-branch-card is-empty">
                            <span className="correo-selected-kicker">Sucursal elegida</span>
                            <strong>Aun no seleccionaste una sucursal</strong>
                            <p>Haz clic en una opcion del listado para confirmar tu punto de retiro.</p>
                          </div>
                        )}
                      </aside>

                      <div className="branch-selector">
                        <div className="branch-selector-header">
                          <div>
                            <h4>Selecciona una sucursal *</h4>
                            <p>Te mostraremos el punto de retiro disponible segun tu direccion.</p>
                          </div>
                          {selectedBranch ? (
                            <span className="branch-selected-pill">{selectedBranch.name}</span>
                          ) : null}
                        </div>

                        <div className="branch-list">
                          {branches.map((branch) => (
                            <div
                              key={branch.id}
                              className={`branch-card ${
                                selectedBranch?.id === branch.id ? "selected" : ""
                              }`}
                              onClick={() => setSelectedBranch(branch)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedBranch(branch);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              aria-pressed={selectedBranch?.id === branch.id}
                            >
                              <div className="branch-info">
                                <strong>{branch.name}</strong>
                                <p>
                                  {branch.address}, {branch.city}
                                </p>
                                <small>{branch.hours}</small>
                              </div>
                              <button type="button" className="btn-select">
                                {selectedBranch?.id === branch.id ? "Seleccionada" : "Seleccionar"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-card step-card">
              <div className="step-header">
                <span className="step-num">3</span>
                <div>
                  <h3>Forma de pago</h3>
                  <p>Tu compra se procesa online de forma segura con Mercado Pago.</p>
                </div>
              </div>

              <div className="step-body payment-grid">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`payment-option ${form.paymentMethod === method.id ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={form.paymentMethod === method.id}
                      onChange={(event) => setField("paymentMethod", event.target.value)}
                    />
                    <CreditCard className="icon" />
                    <div className="txt">
                      <strong>{method.label}</strong>
                      <p>{method.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="final-checkout-action">
              {formError && <p className="error-alert">{formError}</p>}

              <button
                type="button"
                className="btn-whatsapp-confirm"
                disabled={submitting || !items.length}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={20} className="spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Ir a pagar con Mercado Pago
                  </>
                )}
              </button>

              <p className="help-txt">
                Al continuar se abrira el checkout seguro de Mercado Pago con tu pedido ya registrado.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Trash2, MapPin, Truck, CreditCard, MessageCircle, ChevronRight, CheckCircle2, Search } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_WHATSAPP } from "../data/constants";
import { createOrder } from "../utils/orders";
import { formatCurrency } from "../utils/currency";
import { getEffectivePrice } from "../utils/catalog";
import { determinarTipoEnvioPorDireccion } from "../utils/delivery";
import { obtenerSucursalesCorreoArgentino } from "../data/branches";
import "./checkout.css";

const PAYMENT_METHODS = [
  { id: 'transferencia', label: 'Transferencia / Alias / CBU', description: 'Pagá con transferencia bancaria o Mercado Pago.' },
  { id: 'link', label: 'Link de pago', description: 'Te enviamos un link para pagar con tarjeta o saldo.' }
];

function buildWhatsAppMessage(order) {
  const deliveryDetail = order.delivery.type === "moto" 
    ? "Moto mensajería (Zona Sur)" 
    : "Correo Argentino a Sucursal";

  const lines = [
    "*¡Hola! Quiero confirmar mi pedido en Grizzly Suplementos* 🐻",
    `Pedido N°: ${order.number}`,
    "-----------------------------------",
    `Nombre: ${order.customer.name}`,
    `Teléfono: ${order.customer.phone}`,
    order.customer.email ? `Email: ${order.customer.email}` : "",
    "",
    "*Productos:*",
    ...order.items.map((item) => `- ${item.name} x${item.quantity}`),
    "",
    `Subtotal: ${formatCurrency(order.totals.subtotal)}`,
    `Descuentos: ${formatCurrency(order.totals.discount)}`,
    `Envío: ${formatCurrency(order.totals.shipping)}`,
    `*Total a pagar: ${formatCurrency(order.totals.total)}*`,
    "-----------------------------------",
    `*Entrega:* ${deliveryDetail}`,
    `Localidad: ${order.delivery.locality} (${order.delivery.postalCode})`,
    `Dirección: ${order.delivery.address}`,
  ];

  if (order.delivery.type === "correo") {
    lines.push(
      "",
      "*Sucursal de Correo Seleccionada:*",
      `Nombre: ${order.delivery.branch.name}`,
      `Dirección: ${order.delivery.branch.address}, ${order.delivery.branch.city}`
    );
  }

  if (order.observation) {
    lines.push("", `*Observaciones:* ${order.observation}`);
  }

  lines.push("", "Quedo atento/a para recibir los datos de pago. ¡Gracias!");

  return lines.join("\n");
}

const FREE_SHIPPING_THRESHOLD = 120000;

function FreeShippingProgress({ currentAmount }) {
  const safeAmount = Math.max(0, currentAmount || 0);
  const progress = Math.min(
    100,
    Math.round((safeAmount / FREE_SHIPPING_THRESHOLD) * 100)
  );

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - safeAmount);
  const unlocked = remaining === 0;

  return (
    <div className={`free-shipping-card ${unlocked ? "unlocked" : ""}`}>
      <div className="free-shipping-copy">
        <Truck size={18} />
        <div>
          <strong>
            {unlocked
              ? "¡Ya tenés envío gratis!"
              : `Te faltan ${formatCurrency(remaining)} para envío gratis`}
          </strong>
          <span>
            Envío gratis superando {formatCurrency(FREE_SHIPPING_THRESHOLD)}
          </span>
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
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: currentUser?.name || "",
    phone: currentUser?.phone || "",
    email: currentUser?.email || "",
    address: "",
    locality: "",
    postalCode: "",
    paymentMethod: "",
    observation: "",
  });

  const [deliveryInfo, setDeliveryInfo] = useState({ loading: false, type: null, cost: 0 });
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detección automática de envío al completar dirección
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (form.address.length > 5 && form.locality.length > 3 && form.postalCode.length >= 4) {
        setDeliveryInfo(prev => ({ ...prev, loading: true }));
        const result = await determinarTipoEnvioPorDireccion(form);
        if (result) {
          setDeliveryInfo({ loading: false, type: result.type, cost: result.cost });
          if (result.type === 'correo') {
            const branchList = await obtenerSucursalesCorreoArgentino(form);
            setBranches(branchList);
          } else {
            setBranches([]);
            setSelectedBranch(null);
          }
        }
      }
    }, 800);
    return () => clearTimeout(debounceTimer);
  }, [form.address, form.locality, form.postalCode]);

  const freeShippingBase = summary.total;
  const hasFreeShipping = freeShippingBase >= FREE_SHIPPING_THRESHOLD;

  const shippingCost = useMemo(() => {
    if (hasFreeShipping) return 0;
    return deliveryInfo.cost;
  }, [deliveryInfo.cost, hasFreeShipping]);

  const total = summary.total + shippingCost;

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    if (!items.length) {
      return "Tu carrito está vacío.";
    }

    if (!form.name.trim() || !form.phone.trim()) return "Nombre y teléfono son obligatorios.";
    if (!form.address.trim() || !form.locality.trim() || !form.postalCode.trim()) return "Completá los datos de domicilio.";
    if (!deliveryInfo.type) return "Aún no pudimos calcular tu tipo de envío.";
    if (deliveryInfo.type === 'correo' && !selectedBranch) return "Por favor, seleccioná una sucursal de correo.";
    if (!form.paymentMethod) return "Seleccioná una forma de pago.";

    return "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    setSubmitting(true);

    const orderPayload = {
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      },
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: getEffectivePrice(item),
        subtotal: getEffectivePrice(item) * item.quantity,
      })),
      totals: {
        subtotal: summary.subtotal,
        discount: summary.discount,
        shipping: shippingCost,
        total: total,
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

    const order = createOrder(orderPayload);
    const message = buildWhatsAppMessage(order);
    const whatsappUrl = `https://wa.me/${DEFAULT_WHATSAPP}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    clearCart();
    setSubmitting(false);
    navigate(`/seguimiento?pedido=${order.number}&telefono=${encodeURIComponent(form.phone.trim())}`);
  };

  return (
    <div className="checkout-container">
      <div className="container section-space">
        <header className="checkout-header">
          <p className="kicker">Proceso de compra</p>
          <h1>Finalizá tu pedido</h1>
          <span className="subtitle">Completá tus datos para coordinar el envío y el pago por WhatsApp.</span>
        </header>

        <div className="checkout-grid">
          {/* COLUMNA IZQUIERDA: RESUMEN (STICKY EN DESKTOP) */}
          <aside className="checkout-sidebar">
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
          <p>Tu carrito está vacío.</p>
          <Link to="/productos" className="back-to-shop-link">
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
                Envío
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
            <CheckCircle2 size={16} />
            <span>Compra segura. Coordinamos el pedido por WhatsApp.</span>
          </div>
        </>
      )}
          </aside>

          {/* COLUMNA DERECHA: PASOS DEL FORMULARIO */}
          <main className="checkout-steps">
            <div className="admin-card step-card">
              <div className="step-header">
                <span className="step-num">1</span>
                <div>
                  <h3>Datos de contacto</h3>
                  <p>Necesarios para identificarte y enviarte el pedido.</p>
                </div>
              </div>
              <div className="step-body grid-2">
                <label className="input-group">
                  Nombre completo *
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setField("name", e.target.value)}
                    placeholder="Ej: Juan Pérez"
                  />
                </label>

                <label className="input-group">
                  Teléfono *
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setField("phone", e.target.value)}
                    placeholder="Ej: 1123456789"
                  />
                </label>

                <label className="input-group full">
                  Email opcional
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setField("email", e.target.value)}
                    placeholder="tu@email.com"
                  />
                </label>
              </div>
            </div>

            <div className="admin-card step-card">
              <div className="step-header">
                <span className="step-num">2</span>
                <div>
                  <h3>Dirección y Entrega</h3>
                  <p>Ingresá tu ubicación para detectar el método de envío.</p>
                </div>
              </div>
              <div className="step-body">
                <div className="grid-3">
                  <label className="input-group">Dirección * <input type="text" value={form.address} onChange={e => setField("address", e.target.value)} /></label>
                  <label className="input-group">Localidad * <input type="text" value={form.locality} onChange={e => setField("locality", e.target.value)} /></label>
                  <label className="input-group">C.P. * <input type="text" value={form.postalCode} onChange={e => setField("postalCode", e.target.value)} /></label>
                </div>

                {deliveryInfo.loading && <div className="delivery-status loading">Calculando tipo de envío...</div>}
                
                {deliveryInfo.type === 'moto' && (
                  <div className="delivery-result-card moto">
                    <Truck className="icon" />
                    <div>
                      <strong>Moto mensajería disponible</strong>
                      <p>Estás dentro de los 10km de Burzaco. Tu pedido llegará rápido por moto.</p>
                    </div>
                  </div>
                )}

                {deliveryInfo.type === 'correo' && (
                  <div className="correo-selection-area">
                    <div className="delivery-result-card correo">
                      <MapPin className="icon" />
                      <div>
                        <strong>Envío por Correo Argentino</strong>
                        <p>Estás fuera de la zona de moto. Por favor seleccioná una sucursal cercana.</p>
                      </div>
                    </div>

                    <div className="branch-selector">
                      <h4>Seleccioná una sucursal *</h4>
                      <div className="branch-list">
                        {branches.map(branch => (
                          <div 
                            key={branch.id} 
                            className={`branch-card ${selectedBranch?.id === branch.id ? 'selected' : ''}`}
                            onClick={() => setSelectedBranch(branch)}
                          >
                            <div className="branch-info">
                              <strong>{branch.name}</strong>
                              <p>{branch.address}, {branch.city}</p>
                              <small>{branch.hours}</small>
                            </div>
                            <button type="button" className="btn-select">
                              {selectedBranch?.id === branch.id ? 'Seleccionada' : 'Seleccionar'}
                            </button>
                          </div>
                        ))}
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
                  <p>Elegí cómo preferís abonar tu compra.</p>
                </div>
              </div>
              <div className="step-body payment-grid">
                {PAYMENT_METHODS.map(method => (
                  <label key={method.id} className={`payment-option ${form.paymentMethod === method.id ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value={method.id} 
                      checked={form.paymentMethod === method.id}
                      onChange={e => setField("paymentMethod", e.target.value)}
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
                  "Generando orden..."
                ) : (
                  <>
                    <MessageCircle size={20} />
                    Finalizar pedido por WhatsApp
                  </>
                )}
              </button>
              <p className="help-txt">Al hacer clic, se abrirá WhatsApp con el detalle de tu pedido listo para enviar.</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;

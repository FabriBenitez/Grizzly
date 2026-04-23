import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_WHATSAPP, DELIVERY_METHODS, PAYMENT_METHODS } from "../data/constants";
import { createOrder } from "../utils/orders";
import { formatCurrency } from "../utils/currency";
import { getEffectivePrice } from "../utils/catalog";

function buildWhatsAppMessage(order) {
  const lines = [
    "Hola, quiero confirmar este pedido:",
    `Pedido N°: ${order.number}`,
    `Nombre: ${order.customer.name}`,
    `Teléfono: ${order.customer.phone}`,
    "Productos:",
    ...order.items.map((item) => `- ${item.name} x${item.quantity}`),
    "",
    `Subtotal: ${formatCurrency(order.totals.subtotal)}`,
    `Descuentos: ${formatCurrency(order.totals.discount)}`,
    `Envío: ${formatCurrency(order.totals.shipping)}`,
    `Total: ${formatCurrency(order.totals.total)}`,
    `Forma de entrega: ${order.delivery.type === "envio" ? "Envío a domicilio" : "Retiro presencial"}`,
  ];

  if (order.delivery.type === "envio") {
    lines.push(
      `Dirección: ${order.delivery.address}`,
      `Localidad: ${order.delivery.locality}`,
      `Código postal: ${order.delivery.postalCode}`,
    );
  } else {
    lines.push(
      `Retira: ${order.delivery.pickupPerson}`,
      `Franja horaria: ${order.delivery.pickupWindow || "A coordinar"}`,
    );
  }

  if (order.observation) {
    lines.push(`Observación: ${order.observation}`);
  }

  lines.push("Quedo atento/a para recibir el alias y realizar el pago.");

  return lines.join("\n");
}

function CheckoutPage() {
  const { items, summary, updateQuantity, removeItem, clearCart } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: currentUser?.name || "",
    phone: currentUser?.phone || "",
    email: currentUser?.email || "",
    deliveryType: "envio",
    pickupPerson: "",
    pickupWindow: "",
    address: "",
    locality: "",
    postalCode: "",
    paymentMethod: "transferencia",
    observation: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shippingCost = useMemo(() => {
    if (form.deliveryType === "retiro") {
      return 0;
    }
    return summary.shipping;
  }, [form.deliveryType, summary.shipping]);

  const total = summary.total + shippingCost;

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const validate = () => {
    if (!items.length) {
      return "Tu carrito está vacío.";
    }

    if (!form.name.trim() || !form.phone.trim()) {
      return "Completá nombre y teléfono.";
    }

    if (form.deliveryType === "envio") {
      if (!form.address.trim() || !form.locality.trim() || !form.postalCode.trim()) {
        return "Para envío, completá dirección, localidad y código postal.";
      }
    }

    if (form.deliveryType === "retiro" && !form.pickupPerson.trim()) {
      return "Para retiro presencial, indicá quién retira.";
    }

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
        total,
      },
      delivery: {
        type: form.deliveryType,
        pickupPerson: form.pickupPerson.trim(),
        pickupWindow: form.pickupWindow.trim(),
        address: form.address.trim(),
        locality: form.locality.trim(),
        postalCode: form.postalCode.trim(),
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
    <div className="container section-space checkout-page">
      <header className="section-title">
        <p>Checkout</p>
        <h1>Confirmá tu pedido</h1>
        <span>Finalizá la compra y enviá la orden prearmada por WhatsApp.</span>
      </header>

      <div className="checkout-layout">
        <section className="checkout-cart">
          <h2>Tu carrito</h2>
          {!items.length ? (
            <div className="empty-box">
              <h3>No hay productos en el carrito</h3>
              <p>Explorá el catálogo para agregar suplementos.</p>
              <Link to="/catalogo" className="btn-primary">
                Ir al catálogo
              </Link>
            </div>
          ) : (
            <>
              <ul className="cart-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <img src={item.image} alt={item.name} />
                    <div>
                      <h4>{item.name}</h4>
                      <p>{formatCurrency(getEffectivePrice(item))}</p>
                      <div className="qty-control">
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          +
                        </button>
                      </div>
                    </div>
                    <button type="button" className="remove-btn" onClick={() => removeItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="checkout-summary">
                <p>
                  <span>Subtotal</span>
                  <b>{formatCurrency(summary.subtotal)}</b>
                </p>
                <p>
                  <span>Descuentos</span>
                  <b>-{formatCurrency(summary.discount)}</b>
                </p>
                <p>
                  <span>Envío estimado</span>
                  <b>{formatCurrency(shippingCost)}</b>
                </p>
                <p className="total">
                  <span>Total</span>
                  <b>{formatCurrency(total)}</b>
                </p>
              </div>
            </>
          )}
        </section>

        <section className="checkout-form">
          <h2>Datos del pedido</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Nombre completo
              <input
                type="text"
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                required
              />
            </label>
            <label>
              Teléfono
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                required
              />
            </label>
            <label>
              Email (opcional)
              <input
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </label>

            <fieldset>
              <legend>Forma de entrega</legend>
              <div className="radio-grid">
                {DELIVERY_METHODS.map((method) => (
                  <label key={method.id} className="radio-box">
                    <input
                      type="radio"
                      name="deliveryType"
                      value={method.id}
                      checked={form.deliveryType === method.id}
                      onChange={(event) => setField("deliveryType", event.target.value)}
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {form.deliveryType === "retiro" ? (
              <div className="conditional-box">
                <label>
                  Nombre de quien retira
                  <input
                    type="text"
                    value={form.pickupPerson}
                    onChange={(event) => setField("pickupPerson", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Franja horaria (opcional)
                  <input
                    type="text"
                    value={form.pickupWindow}
                    onChange={(event) => setField("pickupWindow", event.target.value)}
                    placeholder="Ej: 15 a 18 hs"
                  />
                </label>
              </div>
            ) : (
              <div className="conditional-box">
                <label>
                  Dirección
                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) => setField("address", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Localidad
                  <input
                    type="text"
                    value={form.locality}
                    onChange={(event) => setField("locality", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Código postal
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(event) => setField("postalCode", event.target.value)}
                    required
                  />
                </label>
              </div>
            )}

            <fieldset>
              <legend>Forma de pago</legend>
              <div className="radio-grid">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method.id} className="radio-box">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={form.paymentMethod === method.id}
                      onChange={(event) => setField("paymentMethod", event.target.value)}
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label>
              Observaciones
              <textarea
                rows={4}
                value={form.observation}
                onChange={(event) => setField("observation", event.target.value)}
                placeholder="Ej: timbre no funciona, departamento B, etc."
              />
            </label>

            {formError && <p className="feedback-error">{formError}</p>}

            <button type="submit" className="btn-primary full" disabled={submitting || !items.length}>
              {submitting ? "Generando pedido..." : "Finalizar pedido por WhatsApp"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default CheckoutPage;

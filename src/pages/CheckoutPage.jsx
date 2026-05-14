import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  MapPin,
  CircleAlert,
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
const CHECKOUT_DRAFT_STORAGE_KEY = "grizzly_checkout_draft";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SECTION_IDS = {
  contact: "checkout-contact-step",
  delivery: "checkout-delivery-step",
  payment: "checkout-payment-step",
};
const FORM_FIELDS = [
  "name",
  "phone",
  "email",
  "address",
  "locality",
  "postalCode",
  "paymentMethod",
  "branch",
];

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
        <span className="free-shipping-fill" style={{ "--free-progress": `${progress}%` }} />
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawDraft = window.localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);

      if (!rawDraft) {
        return;
      }

      const parsedDraft = JSON.parse(rawDraft);

      if (parsedDraft?.form && typeof parsedDraft.form === "object") {
        setForm((prev) => ({
          ...prev,
          ...parsedDraft.form,
          paymentMethod: parsedDraft.form.paymentMethod || prev.paymentMethod,
        }));
      }

      if (parsedDraft?.selectedBranch) {
        setSelectedBranch(parsedDraft.selectedBranch);
      }

      setDraftRestored(true);
    } catch {
      // Si falla la lectura del borrador, seguimos con el checkout limpio.
    }
  }, []);

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
        setSelectedBranch((prevSelectedBranch) =>
          branchList.find((branch) => branch.id === prevSelectedBranch?.id) ?? null,
        );
      } else {
        setBranches([]);
        setSelectedBranch(null);
      }
    }, 800);

    return () => window.clearTimeout(debounceTimer);
  }, [form.address, form.locality, form.postalCode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const isDraftEmpty =
      !form.name &&
      !form.phone &&
      !form.email &&
      !form.address &&
      !form.locality &&
      !form.postalCode &&
      !selectedBranch;

    try {
      if (isDraftEmpty) {
        window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(
        CHECKOUT_DRAFT_STORAGE_KEY,
        JSON.stringify({
          form,
          selectedBranch,
        }),
      );
    } catch {
      // Si localStorage falla, no bloqueamos la experiencia.
    }
  }, [form, selectedBranch]);

  const freeShippingBase = summary.total;
  const hasFreeShipping = freeShippingBase >= FREE_SHIPPING_THRESHOLD;

  const shippingCost = useMemo(() => {
    if (hasFreeShipping) {
      return 0;
    }

    return deliveryInfo.cost;
  }, [deliveryInfo.cost, hasFreeShipping]);

  const total = summary.total + shippingCost;

  const selectedPaymentMethod = useMemo(
    () => PAYMENT_METHODS.find((method) => method.id === form.paymentMethod) ?? PAYMENT_METHODS[0],
    [form.paymentMethod],
  );

  const deliveryModeLabel = useMemo(() => {
    if (deliveryInfo.type === "correo") {
      return "Retiro por sucursal";
    }

    if (deliveryInfo.type === "moto") {
      return "Moto mensajeria";
    }

    return "Pendiente de calculo";
  }, [deliveryInfo.type]);

  const isContactReady =
    form.name.trim().length >= 3 &&
    form.phone.trim().length >= 8 &&
    EMAIL_REGEX.test(form.email.trim());

  const hasStartedContact =
    form.name.trim().length > 0 || form.phone.trim().length > 0 || form.email.trim().length > 0;

  const isAddressFilledEnough =
    form.address.trim().length >= 6 &&
    form.locality.trim().length >= 3 &&
    form.postalCode.trim().length >= 4;

  const hasStartedDelivery =
    form.address.trim().length > 0 ||
    form.locality.trim().length > 0 ||
    form.postalCode.trim().length > 0;

  const isBranchReady = deliveryInfo.type !== "correo" || Boolean(selectedBranch);
  const isDeliveryReady =
    isAddressFilledEnough && !deliveryInfo.loading && Boolean(deliveryInfo.type) && isBranchReady;

  const hasStartedPayment = Boolean(form.paymentMethod);
  const isPaymentReady = Boolean(form.paymentMethod);

  const resolveStepState = ({ ready, started }) => {
    if (ready) {
      return "complete";
    }

    if (started) {
      return "progress";
    }

    return "pending";
  };

  const stepStatuses = useMemo(
    () => ({
      contact: resolveStepState({ ready: isContactReady, started: hasStartedContact }),
      delivery: resolveStepState({
        ready: isDeliveryReady,
        started: hasStartedDelivery || deliveryInfo.loading,
      }),
      payment: resolveStepState({ ready: isPaymentReady, started: hasStartedPayment }),
    }),
    [
      deliveryInfo.loading,
      hasStartedContact,
      hasStartedDelivery,
      hasStartedPayment,
      isContactReady,
      isDeliveryReady,
      isPaymentReady,
    ],
  );

  const progressSteps = useMemo(
    () => [
      {
        id: "contact",
        title: "Contacto",
        state: stepStatuses.contact,
        helper: isContactReady ? "Listo para continuar" : "Nombre, telefono y email",
      },
      {
        id: "delivery",
        title: "Entrega",
        state: stepStatuses.delivery,
        helper: isDeliveryReady ? deliveryModeLabel : "Direccion y envio",
      },
      {
        id: "payment",
        title: "Pago",
        state: stepStatuses.payment,
        helper: selectedPaymentMethod?.label || "Metodo pendiente",
      },
    ],
    [
      deliveryModeLabel,
      isContactReady,
      isDeliveryReady,
      selectedPaymentMethod,
      stepStatuses.contact,
      stepStatuses.delivery,
      stepStatuses.payment,
    ],
  );

  const getStepBadgeLabel = (status) => {
    if (status === "complete") {
      return "Completo";
    }

    if (status === "progress") {
      return "En curso";
    }

    return "Pendiente";
  };

  const deliveryStatus = useMemo(() => {
    if (!hasStartedDelivery) {
      return {
        tone: "neutral",
        title: "Completa tu direccion para calcular el envio",
        description: "Necesitamos direccion, localidad y codigo postal para mostrar la opcion disponible.",
      };
    }

    if (!isAddressFilledEnough) {
      return {
        tone: "neutral",
        title: "Faltan datos para calcular el envio",
        description: "Completa una direccion mas detallada, localidad y codigo postal valido.",
      };
    }

    if (deliveryInfo.loading) {
      return {
        tone: "loading",
        title: "Estamos calculando tu opcion de entrega",
        description: "En segundos te mostramos si corresponde moto o retiro por sucursal.",
      };
    }

    if (deliveryInfo.type === "moto") {
      return {
        tone: "success",
        title: "Entrega rapida confirmada",
        description: "Tu direccion entra en la zona de moto mensajeria y ya tenemos el costo estimado.",
      };
    }

    if (deliveryInfo.type === "correo" && selectedBranch) {
      return {
        tone: "success",
        title: "Sucursal confirmada para el retiro",
        description: `${selectedBranch.name} - ${selectedBranch.city}`,
      };
    }

    if (deliveryInfo.type === "correo") {
      return {
        tone: "warning",
        title: "Ya encontramos sucursales disponibles",
        description: "Solo falta elegir la sucursal de retiro que mas te convenga.",
      };
    }

    return {
      tone: "warning",
      title: "Todavia no pudimos resolver el envio",
      description: "Revisa los datos de direccion o intenta nuevamente en unos segundos.",
    };
  }, [
    deliveryInfo.loading,
    deliveryInfo.type,
    hasStartedDelivery,
    isAddressFilledEnough,
    selectedBranch,
  ]);

  const checkoutSections = useMemo(
    () => [
      {
        title: "Datos del cliente",
        lines: [
          form.name.trim() || "Nombre pendiente",
          form.phone.trim() || "Telefono pendiente",
          form.email.trim() || "Email pendiente",
        ],
      },
      {
        title: "Entrega",
        lines: [
          form.address.trim() || "Direccion pendiente",
          [form.locality.trim(), form.postalCode.trim()].filter(Boolean).join(" - ") ||
            "Localidad y codigo postal pendientes",
          deliveryInfo.type === "correo"
            ? selectedBranch
              ? `${selectedBranch.name} - ${selectedBranch.city}`
              : "Sucursal pendiente de seleccion"
            : deliveryModeLabel,
        ],
      },
      {
        title: "Pago",
        lines: [
          selectedPaymentMethod?.label || "Metodo pendiente",
          `Total estimado ${formatCurrency(total)}`,
        ],
      },
    ],
    [
      deliveryInfo.type,
      deliveryModeLabel,
      form.address,
      form.email,
      form.locality,
      form.name,
      form.phone,
      form.postalCode,
      selectedBranch,
      selectedPaymentMethod,
      total,
    ],
  );

  const getFieldError = (field, nextForm = form) => {
    const trimmedValue = typeof nextForm[field] === "string" ? nextForm[field].trim() : "";

    if (field === "name") {
      if (!trimmedValue) {
        return "Ingresa tu nombre completo.";
      }

      if (trimmedValue.length < 3) {
        return "El nombre debe tener al menos 3 letras.";
      }
    }

    if (field === "phone") {
      if (!trimmedValue) {
        return "Ingresa tu telefono.";
      }

      if (trimmedValue.length < 8) {
        return "El telefono debe tener al menos 8 numeros.";
      }
    }

    if (field === "email") {
      if (!trimmedValue) {
        return "El email es obligatorio para continuar.";
      }

      if (!EMAIL_REGEX.test(trimmedValue)) {
        return "Ingresa un email valido.";
      }
    }

    if (field === "address") {
      if (!trimmedValue) {
        return "Completa la direccion de entrega.";
      }

      if (trimmedValue.length < 6) {
        return "La direccion debe ser mas detallada.";
      }
    }

    if (field === "locality") {
      if (!trimmedValue) {
        return "Ingresa tu localidad.";
      }

      if (trimmedValue.length < 3) {
        return "La localidad debe tener al menos 3 letras.";
      }
    }

    if (field === "postalCode") {
      if (!trimmedValue) {
        return "Ingresa el codigo postal.";
      }

      if (trimmedValue.length < 4) {
        return "El codigo postal debe tener al menos 4 numeros.";
      }
    }

    if (field === "paymentMethod" && !nextForm.paymentMethod) {
      return "Selecciona una forma de pago.";
    }

    if (field === "branch" && deliveryInfo.type === "correo" && !selectedBranch) {
      return "Selecciona una sucursal para continuar.";
    }

    return "";
  };

  const validateCheckout = (nextForm = form) => {
    const nextFieldErrors = {};

    if (!items.length) {
      return {
        fieldErrors: nextFieldErrors,
        formError: "Tu carrito esta vacio.",
      };
    }

    ["name", "phone", "email", "address", "locality", "postalCode", "paymentMethod"].forEach(
      (field) => {
        const error = getFieldError(field, nextForm);

        if (error) {
          nextFieldErrors[field] = error;
        }
      },
    );

    if (deliveryInfo.loading) {
      return {
        fieldErrors: nextFieldErrors,
        formError: "Estamos calculando las opciones de envio. Espera un instante.",
      };
    }

    if (!nextFieldErrors.address && !nextFieldErrors.locality && !nextFieldErrors.postalCode) {
      if (!deliveryInfo.type) {
        return {
          fieldErrors: nextFieldErrors,
          formError: "Aun no pudimos calcular tu tipo de envio.",
        };
      }

      if (deliveryInfo.type === "correo") {
        const branchError = getFieldError("branch", nextForm);

        if (branchError) {
          nextFieldErrors.branch = branchError;
        }
      }
    }

    return {
      fieldErrors: nextFieldErrors,
      formError: "",
    };
  };

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

    const nextForm = {
      ...form,
      [field]: nextValue,
    };

    setForm(nextForm);
    setFormError("");

    if (fieldErrors[field] || touchedFields[field]) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: getFieldError(field, nextForm),
      }));
    }

    if (
      (field === "address" || field === "locality" || field === "postalCode") &&
      (fieldErrors.branch || touchedFields.branch)
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        branch: "",
      }));
    }

    if (isConfirmationOpen) {
      setIsConfirmationOpen(false);
    }
  };

  const handleFieldBlur = (field) => {
    setTouchedFields((prev) => ({
      ...prev,
      [field]: true,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [field]: getFieldError(field),
    }));
  };

  const handleBranchSelect = (branch) => {
    setSelectedBranch(branch);
    setTouchedFields((prev) => ({
      ...prev,
      branch: true,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      branch: "",
    }));
    setFormError("");

    if (isConfirmationOpen) {
      setIsConfirmationOpen(false);
    }
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

  const clearCheckoutDraft = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
  };

  const scrollToSection = (sectionId) => {
    if (typeof window === "undefined") {
      return;
    }

    setIsConfirmationOpen(false);

    const targetSection = window.document.getElementById(sectionId);

    if (!targetSection) {
      return;
    }

    targetSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const getFieldStateClass = (field) => {
    if (fieldErrors[field]) {
      return "has-error";
    }

    if (touchedFields[field]) {
      const error = getFieldError(field);

      if (!error) {
        return "is-valid";
      }
    }

    return "";
  };

  const renderFieldMessage = (field, hint) => (
    <span className={fieldErrors[field] ? "field-error" : "field-hint"}>
      {fieldErrors[field] || hint}
    </span>
  );

  const submitCheckout = async () => {
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
        clearCheckoutDraft();
        clearCart();
        window.location.assign(result.initPoint);
        return;
      }

      if (result.checkoutMode === "manual") {
        clearCheckoutDraft();
        clearCart();
        navigate(
          `/checkout/resultado?modo=manual&pedido=${encodeURIComponent(orderNumber)}&telefono=${encodeURIComponent(form.phone.trim())}`,
        );
        return;
      }

      if (result.checkoutMode === "already-approved") {
        clearCheckoutDraft();
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

  const handleReviewOrder = () => {
    const validation = validateCheckout();

    setTouchedFields(
      FORM_FIELDS.reduce(
        (accumulator, field) => ({
          ...accumulator,
          [field]: true,
        }),
        {},
      ),
    );
    setFieldErrors(validation.fieldErrors);
    setFormError(validation.formError);

    if (validation.formError || Object.keys(validation.fieldErrors).length > 0) {
      setIsConfirmationOpen(false);
      return;
    }

    setFormError("");
    setIsConfirmationOpen(true);
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

          {draftRestored ? (
            <p className="checkout-draft-notice">
              Recuperamos tu ultimo avance para que sigas desde donde lo dejaste.
            </p>
          ) : null}

          <div className="checkout-progress-strip" aria-label="Estado del checkout">
            {progressSteps.map((step, index) => (
              <div key={step.id} className={`checkout-progress-step is-${step.state}`}>
                <div className="checkout-progress-icon">
                  {step.state === "complete" ? <CheckCircle2 size={18} /> : <span>{index + 1}</span>}
                </div>
                <div className="checkout-progress-copy">
                  <strong>{step.title}</strong>
                  <span>{step.helper}</span>
                </div>
              </div>
            ))}
          </div>
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

                  <div className="checkout-control-panel">
                    <div className="checkout-control-card">
                      <div className="checkout-control-head">
                        <div>
                          <span className="checkout-control-kicker">Contacto</span>
                          <strong>{form.name.trim() || "Datos pendientes"}</strong>
                        </div>
                        <button
                          type="button"
                          className="checkout-control-edit"
                          onClick={() => scrollToSection(SECTION_IDS.contact)}
                        >
                          Editar
                        </button>
                      </div>
                      <p>{form.phone.trim() || "Telefono pendiente"}</p>
                      <p>{form.email.trim() || "Email pendiente"}</p>
                    </div>

                    <div className="checkout-control-card">
                      <div className="checkout-control-head">
                        <div>
                          <span className="checkout-control-kicker">Entrega</span>
                          <strong>{deliveryModeLabel}</strong>
                        </div>
                        <button
                          type="button"
                          className="checkout-control-edit"
                          onClick={() => scrollToSection(SECTION_IDS.delivery)}
                        >
                          Editar
                        </button>
                      </div>
                      <p>{form.address.trim() || "Direccion pendiente"}</p>
                      <p>
                        {[form.locality.trim(), form.postalCode.trim()].filter(Boolean).join(" - ") ||
                          "Localidad y codigo postal pendientes"}
                      </p>
                      {deliveryInfo.type === "correo" ? (
                        <p>
                          {selectedBranch
                            ? `${selectedBranch.name} - ${selectedBranch.city}`
                            : "Sucursal pendiente de seleccion"}
                        </p>
                      ) : null}
                    </div>

                    <div className="checkout-control-card">
                      <div className="checkout-control-head">
                        <div>
                          <span className="checkout-control-kicker">Pago</span>
                          <strong>{selectedPaymentMethod?.label || "Metodo pendiente"}</strong>
                        </div>
                        <button
                          type="button"
                          className="checkout-control-edit"
                          onClick={() => scrollToSection(SECTION_IDS.payment)}
                        >
                          Editar
                        </button>
                      </div>
                      <p>Total final {formatCurrency(total)}</p>
                      <p>{hasFreeShipping ? "Envio gratis desbloqueado" : `Envio estimado ${formatCurrency(shippingCost)}`}</p>
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
            <div className="admin-card step-card" id={SECTION_IDS.contact}>
              <div className="step-header">
                <span className="step-num">1</span>
                <div>
                  <h3>Datos de contacto</h3>
                  <p>Necesarios para identificarte y enviarte actualizaciones del pedido.</p>
                </div>
                <span className={`step-status-badge is-${stepStatuses.contact}`}>
                  {getStepBadgeLabel(stepStatuses.contact)}
                </span>
              </div>

              <div className="step-body grid-2">
                <label className={`input-group ${getFieldStateClass("name")}`}>
                  Nombre completo *
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    onBlur={() => handleFieldBlur("name")}
                    placeholder="Ej: Juan Perez"
                    autoComplete="name"
                    inputMode="text"
                    title="Ingresa solo letras."
                  />
                  {renderFieldMessage("name", "Solo letras, como figura quien recibe el pedido.")}
                </label>

                <label className={`input-group ${getFieldStateClass("phone")}`}>
                  Telefono *
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    onBlur={() => handleFieldBlur("phone")}
                    placeholder="Ej: 1123456789"
                    autoComplete="tel"
                    inputMode="numeric"
                    title="Ingresa solo numeros."
                  />
                  {renderFieldMessage("phone", "Usaremos este numero para seguimiento y contacto.")}
                </label>

                <label className={`input-group full ${getFieldStateClass("email")}`}>
                  Email *
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    onBlur={() => handleFieldBlur("email")}
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                  {renderFieldMessage("email", "Te enviaremos la confirmacion del pedido y del pago.")}
                </label>
              </div>
            </div>

            <div className="admin-card step-card" id={SECTION_IDS.delivery}>
              <div className="step-header">
                <span className="step-num">2</span>
                <div>
                  <h3>Direccion y entrega</h3>
                  <p>Ingresa tu ubicacion para detectar el metodo de envio disponible.</p>
                </div>
                <span className={`step-status-badge is-${stepStatuses.delivery}`}>
                  {getStepBadgeLabel(stepStatuses.delivery)}
                </span>
              </div>

              <div className="step-body">
                <div className="grid-3">
                  <label className={`input-group ${getFieldStateClass("address")}`}>
                    Direccion *
                    <input
                      type="text"
                      value={form.address}
                      onChange={(event) => setField("address", event.target.value)}
                      onBlur={() => handleFieldBlur("address")}
                      autoComplete="street-address"
                    />
                    {renderFieldMessage("address", "Incluye calle, numero y piso o depto si aplica.")}
                  </label>

                  <label className={`input-group ${getFieldStateClass("locality")}`}>
                    Localidad *
                    <input
                      type="text"
                      value={form.locality}
                      onChange={(event) => setField("locality", event.target.value)}
                      onBlur={() => handleFieldBlur("locality")}
                      autoComplete="address-level2"
                      inputMode="text"
                      title="Ingresa solo letras."
                    />
                    {renderFieldMessage("locality", "Escribe solo letras para identificar bien tu zona.")}
                  </label>

                  <label className={`input-group ${getFieldStateClass("postalCode")}`}>
                    C.P. *
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(event) => setField("postalCode", event.target.value)}
                      onBlur={() => handleFieldBlur("postalCode")}
                      autoComplete="postal-code"
                      inputMode="numeric"
                      title="Ingresa solo numeros."
                    />
                    {renderFieldMessage("postalCode", "Solo numeros. Nos ayuda a calcular envio y sucursal.")}
                  </label>
                </div>

                <div className={`delivery-status is-${deliveryStatus.tone}`}>
                  {deliveryStatus.tone === "success" ? (
                    <CheckCircle2 size={18} />
                  ) : deliveryStatus.tone === "warning" ? (
                    <CircleAlert size={18} />
                  ) : deliveryStatus.tone === "loading" ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <MapPin size={18} />
                  )}

                  <div>
                    <strong>{deliveryStatus.title}</strong>
                    <p>{deliveryStatus.description}</p>
                  </div>
                </div>

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
                        <h4>Elige tu sucursal</h4>
                      </div>
                      <span className="correo-selection-count">
                        {branches.length} {branches.length === 1 ? "opcion" : "opciones"}
                      </span>
                    </div>

                    <div className="correo-selection-layout">
                      <aside className="correo-selection-side">
                        <div className="delivery-result-card correo correo-summary-card">
                          <MapPin className="icon" />
                          <div>
                            <strong>Envio por Correo Argentino</strong>
                            <p>Retira en una sucursal cercana con seguimiento incluido.</p>
                          </div>
                        </div>

                        <div className="correo-selection-benefits">
                          <span>Retiro cercano</span>
                          <span>Seguimiento incluido</span>
                          <span>Punto confirmado</span>
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
                            <strong>Elige una opcion del listado</strong>
                            <p>Cuando la selecciones, quedara fijada aqui.</p>
                          </div>
                        )}
                      </aside>

                      <div className="branch-selector">
                        <div className="branch-selector-header">
                          <div>
                            <h4>Sucursales disponibles *</h4>
                            <p>Elige una para continuar con el pedido.</p>
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
                              onClick={() => handleBranchSelect(branch)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  handleBranchSelect(branch);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              aria-pressed={selectedBranch?.id === branch.id}
                            >
                              <div className="branch-info">
                                <div className="branch-info-head">
                                  <strong>{branch.name}</strong>
                                  <span className="branch-city-chip">{branch.city}</span>
                                </div>
                                <p>{branch.address}</p>
                                <small>{branch.hours}</small>
                              </div>
                              <button type="button" className="btn-select">
                                {selectedBranch?.id === branch.id ? "Sucursal elegida" : "Elegir sucursal"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {fieldErrors.branch ? (
                      <p className="field-error branch-error">{fieldErrors.branch}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-card step-card" id={SECTION_IDS.payment}>
              <div className="step-header">
                <span className="step-num">3</span>
                <div>
                  <h3>Forma de pago</h3>
                  <p>Tu compra se procesa online de forma segura con Mercado Pago.</p>
                </div>
                <span className={`step-status-badge is-${stepStatuses.payment}`}>
                  {getStepBadgeLabel(stepStatuses.payment)}
                </span>
              </div>

              <div className="step-body payment-grid">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`payment-option ${form.paymentMethod === method.id ? "active" : ""} ${fieldErrors.paymentMethod ? "has-error" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={form.paymentMethod === method.id}
                      onChange={(event) => setField("paymentMethod", event.target.value)}
                      onBlur={() => handleFieldBlur("paymentMethod")}
                    />
                    <CreditCard className="icon" />
                    <div className="txt">
                      <strong>{method.label}</strong>
                      <p>{method.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {fieldErrors.paymentMethod ? (
                <p className="field-error payment-error">{fieldErrors.paymentMethod}</p>
              ) : null}
            </div>

            <div className="final-checkout-action">
              {formError && <p className="error-alert">{formError}</p>}

              <div className="checkout-ready-card">
                <div>
                  <span className="checkout-ready-kicker">Ultima revision</span>
                  <strong>Revisa tu pedido antes de abrir Mercado Pago</strong>
                  <p>
                    Te mostraremos tus datos, entrega, sucursal y total final para que confirmes
                    todo.
                  </p>
                </div>
                <div className="checkout-ready-meta">
                  <span>{selectedPaymentMethod?.label}</span>
                  <span>{deliveryModeLabel}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-whatsapp-confirm"
                disabled={submitting || !items.length}
                onClick={handleReviewOrder}
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={20} className="spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Revisar pedido antes de pagar
                  </>
                )}
              </button>

              <p className="help-txt">
                Primero veras una confirmacion final. Despues abriremos el checkout seguro de
                Mercado Pago.
              </p>
            </div>
          </main>
        </div>
      </div>

      {isConfirmationOpen ? (
        <div className="checkout-confirm-overlay" onClick={() => setIsConfirmationOpen(false)}>
          <div
            className="checkout-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="checkout-confirm-header">
              <div>
                <span className="checkout-confirm-kicker">Confirmacion previa al pago</span>
                <h3 id="checkout-confirm-title">Revisa tu pedido antes de continuar</h3>
                <p>
                  Si todo esta correcto, te llevamos directo al checkout seguro de Mercado Pago.
                </p>
              </div>

              <button
                type="button"
                className="checkout-confirm-close"
                onClick={() => setIsConfirmationOpen(false)}
              >
                Seguir editando
              </button>
            </div>

            {formError ? <p className="error-alert modal-error">{formError}</p> : null}

            <div className="checkout-confirm-grid">
              {checkoutSections.map((section) => (
                <section key={section.title} className="checkout-confirm-card">
                  <span className="checkout-confirm-label">{section.title}</span>
                  {section.lines.map((line) => (
                    <p key={`${section.title}-${line}`}>{line}</p>
                  ))}
                </section>
              ))}
            </div>

            <div className="checkout-confirm-order">
              <div className="checkout-confirm-order-head">
                <span className="checkout-confirm-label">Productos</span>
                <strong>
                  {items.length} {items.length === 1 ? "producto" : "productos"}
                </strong>
              </div>

              <ul className="checkout-confirm-items">
                {items.map((item) => (
                  <li key={`confirm-${item.id}`}>
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <strong>{formatCurrency(getEffectivePrice(item) * item.quantity)}</strong>
                  </li>
                ))}
              </ul>

              <div className="checkout-confirm-totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(summary.subtotal)}</strong>
                </div>
                <div>
                  <span>Descuentos</span>
                  <strong>-{formatCurrency(summary.discount)}</strong>
                </div>
                <div>
                  <span>Envio</span>
                  <strong>{formatCurrency(shippingCost)}</strong>
                </div>
                <div className="is-total">
                  <span>Total final</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
              </div>
            </div>

            <div className="checkout-confirm-actions">
              <button
                type="button"
                className="btn-outline-confirm"
                onClick={() => setIsConfirmationOpen(false)}
                disabled={submitting}
              >
                Editar datos
              </button>

              <button
                type="button"
                className="btn-whatsapp-confirm confirm-submit"
                onClick={submitCheckout}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={20} className="spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Confirmar e ir a Mercado Pago
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CheckoutPage;

import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  Percent,
  Tag,
  TicketPercent,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { formatCurrency } from "../../utils/currency";
import {
  deleteAdminCoupon,
  fetchAdminCouponsFromSupabase,
  saveAdminCoupon,
} from "../../utils/coupons.remote";

const emptyDraft = {
  id: "",
  code: "",
  name: "",
  description: "",
  couponType: "percentage",
  couponScope: "order",
  discountValue: "",
  minOrderTotal: "",
  maxDiscountAmount: "",
  usageLimit: "",
  perUserLimit: "",
  startsAt: "",
  endsAt: "",
  active: true,
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCouponInput(value) {
  return normalizeText(value).replace(/\s+/g, "").toUpperCase();
}

function formatDateTimeInput(value) {
  const safeValue = normalizeText(value);

  if (!safeValue) {
    return "";
  }

  const parsed = new Date(safeValue);

  if (!Number.isFinite(parsed.valueOf())) {
    return safeValue.slice(0, 16);
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function serializeDateTimeInput(value) {
  const safeValue = normalizeText(value);

  if (!safeValue) {
    return "";
  }

  const parsed = new Date(safeValue);

  if (!Number.isFinite(parsed.valueOf())) {
    return safeValue;
  }

  return parsed.toISOString();
}

function couponToDraft(coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    description: coupon.description || "",
    couponType: coupon.couponType,
    couponScope: coupon.couponScope,
    discountValue: coupon.discountValue ? String(coupon.discountValue) : "",
    minOrderTotal: coupon.minOrderTotal ? String(coupon.minOrderTotal) : "",
    maxDiscountAmount:
      coupon.maxDiscountAmount == null ? "" : String(coupon.maxDiscountAmount),
    usageLimit: coupon.usageLimit == null ? "" : String(coupon.usageLimit),
    perUserLimit: coupon.perUserLimit == null ? "" : String(coupon.perUserLimit),
    startsAt: formatDateTimeInput(coupon.startsAt),
    endsAt: formatDateTimeInput(coupon.endsAt),
    active: coupon.active,
  };
}

function buildCouponSummary(draft) {
  const couponType = draft.couponType === "fixed" ? "fixed" : "percentage";
  const couponScope = draft.couponScope === "shipping" ? "shipping" : "order";
  const discountValue = Number(draft.discountValue || 0);
  const minOrderTotal = Number(draft.minOrderTotal || 0);

  const discountLabel =
    couponType === "fixed"
      ? `${formatCurrency(discountValue)} menos`
      : `${discountValue || 0}% off`;
  const scopeLabel = couponScope === "shipping" ? "sobre envio" : "sobre subtotal";
  const thresholdLabel = minOrderTotal > 0 ? `desde ${formatCurrency(minOrderTotal)}` : "sin minimo";

  return `${discountLabel} ${scopeLabel} - ${thresholdLabel}`;
}

function AdminPromotionsPage() {
  const [coupons, setCoupons] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const orderedCoupons = useMemo(
    () =>
      [...coupons].sort((left, right) => {
        const activeDiff = Number(right.active) - Number(left.active);

        if (activeDiff !== 0) {
          return activeDiff;
        }

        return String(right.startsAt || "").localeCompare(String(left.startsAt || ""));
      }),
    [coupons],
  );

  const activeCoupons = useMemo(
    () => orderedCoupons.filter((coupon) => coupon.active),
    [orderedCoupons],
  );

  const shippingCoupons = useMemo(
    () => orderedCoupons.filter((coupon) => coupon.couponScope === "shipping"),
    [orderedCoupons],
  );

  const orderCoupons = useMemo(
    () => orderedCoupons.filter((coupon) => coupon.couponScope === "order"),
    [orderedCoupons],
  );

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const remoteCoupons = await fetchAdminCouponsFromSupabase();
      setCoupons(remoteCoupons);
      setSuccessMessage("");
      setErrorMessage("");
    } catch (loadError) {
      setErrorMessage(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar los cupones reales.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetDraft = () => {
    setDraft(emptyDraft);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleEdit = (coupon) => {
    setDraft(couponToDraft(coupon));
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!normalizeText(draft.code) || !normalizeText(draft.name) || !draft.discountValue) {
      setErrorMessage("Completa codigo, nombre y valor de descuento para guardar el cupon.");
      return;
    }

    setSaving(true);

    try {
      await saveAdminCoupon({
        ...draft,
        code: normalizeCouponInput(draft.code),
        startsAt: serializeDateTimeInput(draft.startsAt),
        endsAt: serializeDateTimeInput(draft.endsAt),
      });
      await loadCoupons();
      setSuccessMessage(draft.id ? "Cupon actualizado correctamente." : "Cupon creado correctamente.");
      resetDraft();
    } catch (saveError) {
      setErrorMessage(
        saveError instanceof Error ? saveError.message : "No pudimos guardar el cupon.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon) => {
    setSuccessMessage("");
    setErrorMessage("");
    setSaving(true);

    try {
      await saveAdminCoupon({
        ...coupon,
        active: !coupon.active,
      });
      await loadCoupons();
      setSuccessMessage("Estado del cupon actualizado.");
    } catch (toggleError) {
      setErrorMessage(
        toggleError instanceof Error
          ? toggleError.message
          : "No pudimos actualizar el estado del cupon.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (couponId) => {
    setSuccessMessage("");
    setErrorMessage("");
    setSaving(true);

    try {
      await deleteAdminCoupon(couponId);
      await loadCoupons();
      setSuccessMessage("Cupon eliminado.");

      if (draft.id === couponId) {
        resetDraft();
      }
    } catch (deleteError) {
      setErrorMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "No pudimos eliminar el cupon.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-root promo-admin-page">
      <header className="admin-page-header">
        <p>Promociones</p>
        <h1>Cupones reales sobre Supabase</h1>
        <span>
          Gestiona descuentos por codigo, alcance sobre subtotal o envio, topes y vigencias
          reales para el checkout.
        </span>
      </header>

      {successMessage && <div className="admin-message success" style={{ margin: "12px 0 0" }}>{successMessage}</div>}
      {errorMessage && <div className="admin-message error" style={{ margin: "12px 0 0" }}>{errorMessage}</div>}

      <section className="admin-kpi-grid">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-title" style={{ width: "40%" }}></div>
              <div className="skeleton skeleton-text" style={{ height: 32, width: "70%" }}></div>
              <div className="skeleton skeleton-text" style={{ width: "90%" }}></div>
            </div>
          ))
        ) : (
          <>
            <AdminStatCard
              icon={TicketPercent}
              title="Cupones activos"
              value={activeCoupons.length}
              helper="Visibles para validacion desde checkout."
            />
            <AdminStatCard
              icon={Percent}
              title="Sobre subtotal"
              value={orderCoupons.length}
              helper="Reglas comerciales aplicadas al valor del pedido."
            />
            <AdminStatCard
              icon={Truck}
              title="Sobre envio"
              value={shippingCoupons.length}
              helper="Beneficios puntuales para abaratar el despacho."
              tone="highlight"
            />
            <AdminStatCard
              icon={UserRoundCheck}
              title="Total cargados"
              value={orderedCoupons.length}
              helper="Historico actual de cupones disponibles en base."
              tone="warn"
            />
          </>
        )}
      </section>

      <section className="admin-card promo-step-card">
        <div className="promo-step-head">
          <div>
            <h2>1) Configura el cupon</h2>
            <p>Define el codigo, el tipo de descuento y las reglas operativas reales.</p>
          </div>
        </div>

        <form className="promo-builder" onSubmit={handleSave}>
          <div className="promo-builder-fields">
            <label>
              <span className="promo-field-label">Codigo</span>
              <div className="promo-input-shell with-icon">
                <Tag size={16} />
                <input
                  type="text"
                  placeholder="Ej: GRIZZLY10"
                  value={draft.code}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      code: normalizeCouponInput(event.target.value),
                    }))
                  }
                />
              </div>
            </label>

            <label className="promo-wide">
              <span className="promo-field-label">Nombre</span>
              <div className="promo-input-shell with-icon">
                <TicketPercent size={16} />
                <input
                  type="text"
                  placeholder="Ej: Lanzamiento invierno"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </div>
            </label>

            <label className="promo-wide">
              <span className="promo-field-label">Descripcion</span>
              <div className="promo-input-shell">
                <input
                  type="text"
                  placeholder="Texto breve para entender la regla comercial."
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
            </label>

            <label>
              <span className="promo-field-label">Tipo</span>
              <div className="promo-input-shell with-icon">
                <BadgeDollarSign size={16} />
                <select
                  value={draft.couponType}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, couponType: event.target.value }))
                  }
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </div>
            </label>

            <label>
              <span className="promo-field-label">Alcance</span>
              <div className="promo-input-shell with-icon">
                <Truck size={16} />
                <select
                  value={draft.couponScope}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, couponScope: event.target.value }))
                  }
                >
                  <option value="order">Subtotal del pedido</option>
                  <option value="shipping">Costo de envio</option>
                </select>
              </div>
            </label>

            <label>
              <span className="promo-field-label">Valor del descuento</span>
              <div className="promo-input-shell with-icon">
                <Percent size={16} />
                <input
                  type="number"
                  min="0"
                  placeholder={draft.couponType === "fixed" ? "Ej: 3000" : "Ej: 10"}
                  value={draft.discountValue}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, discountValue: event.target.value }))
                  }
                />
              </div>
            </label>

            <label>
              <span className="promo-field-label">Subtotal minimo</span>
              <div className="promo-input-shell with-icon">
                <BadgeDollarSign size={16} />
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 15000"
                  value={draft.minOrderTotal}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, minOrderTotal: event.target.value }))
                  }
                />
              </div>
            </label>

            <label>
              <span className="promo-field-label">Tope maximo de descuento</span>
              <div className="promo-input-shell with-icon">
                <BadgeDollarSign size={16} />
                <input
                  type="number"
                  min="0"
                  placeholder="Opcional"
                  value={draft.maxDiscountAmount}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))
                  }
                />
              </div>
            </label>

            <label>
              <span className="promo-field-label">Limite total de usos</span>
              <div className="promo-input-shell with-icon">
                <TicketPercent size={16} />
                <input
                  type="number"
                  min="0"
                  placeholder="Opcional"
                  value={draft.usageLimit}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, usageLimit: event.target.value }))
                  }
                />
              </div>
            </label>

            <label>
              <span className="promo-field-label">Limite por usuario</span>
              <div className="promo-input-shell with-icon">
                <UserRoundCheck size={16} />
                <input
                  type="number"
                  min="0"
                  placeholder="Opcional"
                  value={draft.perUserLimit}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, perUserLimit: event.target.value }))
                  }
                />
              </div>
            </label>

            <label>
              <span className="promo-field-label">Vigencia desde</span>
              <div className="promo-input-shell with-icon">
                <CalendarDays size={16} />
                <input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, startsAt: event.target.value }))
                  }
                />
              </div>
            </label>

            <label>
              <span className="promo-field-label">Vigencia hasta</span>
              <div className="promo-input-shell with-icon">
                <CalendarDays size={16} />
                <input
                  type="datetime-local"
                  value={draft.endsAt}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, endsAt: event.target.value }))
                  }
                />
              </div>
            </label>

            <label className="switch-inline promo-wide">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, active: event.target.checked }))
                }
              />
              <span>Cupon activo para checkout</span>
            </label>
          </div>

          <aside className="promo-preview">
            <div className="promo-preview-header">
              <div>
                <h3>Vista previa operativa</h3>
                <p>Resumen de la regla que se validara de verdad en la Edge Function.</p>
              </div>
              <span className="promo-preview-pill">
                {draft.couponScope === "shipping" ? "Envio" : "Pedido"}
              </span>
            </div>

            <article className="promo-preview-card">
              <div className="promo-preview-copy">
                <small className="promo-preview-kicker">Cupon real</small>
                <small className="promo-preview-file">
                  Codigo: {draft.code || "SINCODIGO"}
                </small>
                <h4>{draft.name || "Nombre del cupon"}</h4>
                <p className="promo-preview-description">
                  {draft.description || "Describe en una frase corta cuando conviene usar este beneficio."}
                </p>

                <div className="promo-preview-meta">
                  <span>
                    <b>Regla</b>
                    {buildCouponSummary(draft)}
                  </span>
                  <span>
                    <b>Uso total</b>
                    {draft.usageLimit || "sin limite"}
                  </span>
                  <span>
                    <b>Por usuario</b>
                    {draft.perUserLimit || "sin limite"}
                  </span>
                </div>

                <button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : draft.id ? "Guardar cambios" : "Crear cupon"}
                </button>
              </div>
            </article>
          </aside>
        </form>
      </section>

      <section className="admin-card promo-step-card">
        <div className="promo-step-head">
          <div>
            <h2>2) Cupones cargados</h2>
            <p>Activa, pausa o edita reglas comerciales persistidas en Supabase.</p>
          </div>
        </div>

        <div className="promo-list-grid">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <article key={i} className="promo-item off">
                <div className="promo-item-content" style={{ width: "100%" }}>
                  <div className="skeleton skeleton-title" style={{ width: "50%", height: 20 }}></div>
                  <div className="skeleton skeleton-text" style={{ width: "80%" }}></div>
                  <div className="skeleton skeleton-text" style={{ width: "90%", height: 10 }}></div>
                  <div className="skeleton skeleton-text" style={{ width: "40%", height: 10 }}></div>
                </div>
              </article>
            ))
          ) : (
            orderedCoupons.map((coupon) => (
              <article key={coupon.id} className={`promo-item ${coupon.active ? "on" : "off"}`}>
                <div className="promo-item-content">
                  <header>
                    <strong>{coupon.name}</strong>
                    <span>{coupon.active ? "Activo" : "Pausado"}</span>
                  </header>
                  <p>
                    <b>{coupon.code}</b> - {buildCouponSummary(couponToDraft(coupon))}
                  </p>
                  <p>{coupon.description || "Sin descripcion comercial cargada."}</p>
                  <small>
                    {coupon.startsAt || "sin inicio"} - {coupon.endsAt || "sin fin"}
                  </small>
                  {coupon.usageLimit != null ? (
                    <small>Limite total: {coupon.usageLimit} usos</small>
                  ) : null}
                </div>

                <div className="promo-actions">
                  <button type="button" onClick={() => handleEdit(coupon)} disabled={saving}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleToggle(coupon)} disabled={saving}>
                    {coupon.active ? "Desactivar" : "Activar"}
                  </button>
                  <button type="button" onClick={() => handleDelete(coupon.id)} disabled={saving}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminPromotionsPage;

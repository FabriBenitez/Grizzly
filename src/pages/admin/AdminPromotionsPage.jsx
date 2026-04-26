import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  Gift,
  ImagePlus,
  Package2,
  Tag,
} from "lucide-react";
import { products } from "../../data/products";
import { formatCurrency } from "../../utils/currency";

const promotionTemplates = [
  {
    id: "twoforone",
    name: "2x1",
    type: "2x1",
    description: "Llevas 2 unidades y pagas 1.",
    condition: "Llevando 2, paga 1",
    icon: Gift,
    kind: "bundle",
  },
  {
    id: "threefortwo",
    name: "3x2",
    type: "3x2",
    description: "Llevas 3 unidades y pagas 2.",
    condition: "Llevando 3, paga 2",
    icon: Boxes,
    kind: "bundle",
  },
  {
    id: "fixedamount",
    name: "$ menos",
    type: "Monto fijo",
    description: "Descuento directo por monto sobre un producto puntual.",
    condition: "Descuento directo sobre el precio",
    icon: BadgeDollarSign,
    kind: "fixed",
  },
];

const initialPromotions = [
  {
    id: "promo1",
    name: "Creatinas 2x1 de lanzamiento",
    type: "2x1",
    condition: "Llevando 2, paga 1",
    scopeTarget: "Creatina",
    targetProductId: "p1",
    discountAmount: null,
    image: "/assets/products/combo-creatina-x3.jpg",
    imageName: "combo-creatina-x3.jpg",
    start: "2026-04-01",
    end: "2026-04-30",
    stockLimit: 80,
    active: true,
  },
  {
    id: "promo2",
    name: "Whey 3x2 para clientes frecuentes",
    type: "3x2",
    condition: "Llevando 3, paga 2",
    scopeTarget: "Proteinas whey",
    targetProductId: "p4",
    discountAmount: null,
    image: "/assets/products/whey-doypack.jpg",
    imageName: "whey-doypack.jpg",
    start: "2026-04-05",
    end: "2026-05-10",
    stockLimit: null,
    active: true,
  },
  {
    id: "promo3",
    name: "Creatina 300g con rebaja directa",
    type: "Monto fijo",
    condition: "$5.000 menos",
    scopeTarget: "Creatina Star Nutrition Monohidrato 300g Bolsa",
    targetProductId: "p1",
    discountAmount: 5000,
    image: "/assets/products/creatina-300-bag.jpg",
    imageName: "creatina-300-bag.jpg",
    start: "2026-04-12",
    end: "2026-05-12",
    stockLimit: 60,
    active: true,
  },
];

const emptyDraft = {
  name: "",
  image: "",
  imageName: "",
  scopeTarget: "",
  targetProductId: "",
  discountAmount: "",
  start: "",
  end: "",
  stockLimit: "",
};

function getTemplateDefaultImage(templateType) {
  if (templateType === "3x2") {
    return "/assets/products/whey-doypack.jpg";
  }
  if (templateType === "Monto fijo") {
    return "/assets/products/creatina-300-bag.jpg";
  }
  return "/assets/products/combo-creatina-x3.jpg";
}

function getTemplateDefaultImageName(templateType) {
  if (templateType === "3x2") {
    return "whey-doypack.jpg";
  }
  if (templateType === "Monto fijo") {
    return "creatina-300-bag.jpg";
  }
  return "combo-creatina-x3.jpg";
}

function getTemplateIdByType(type) {
  if (type === "3x2") {
    return "threefortwo";
  }
  if (type === "Monto fijo") {
    return "fixedamount";
  }
  return "twoforone";
}

function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [templateId, setTemplateId] = useState("twoforone");
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const activeTemplate = useMemo(
    () => promotionTemplates.find((template) => template.id === templateId) || promotionTemplates[0],
    [templateId],
  );

  const [draft, setDraft] = useState({
    ...emptyDraft,
    image: getTemplateDefaultImage("2x1"),
    imageName: getTemplateDefaultImageName("2x1"),
  });

  const sortedPromotions = useMemo(
    () =>
      promotions
        .slice()
        .sort(
          (a, b) =>
            Number(b.active) - Number(a.active) ||
            String(b.start).localeCompare(String(a.start)),
        ),
    [promotions],
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === draft.targetProductId) || null,
    [draft.targetProductId],
  );

  const resolvedScopeTarget = selectedProduct?.name || draft.scopeTarget.trim();
  const discountAmount = Number(draft.discountAmount || 0);
  const discountedPreviewPrice =
    activeTemplate.kind === "fixed" && selectedProduct
      ? Math.max(0, selectedProduct.price - discountAmount)
      : 0;

  const resetDraft = () => {
    setDraft({
      ...emptyDraft,
      image: getTemplateDefaultImage(activeTemplate.type),
      imageName: getTemplateDefaultImageName(activeTemplate.type),
    });
    setEditingId("");
  };

  const selectTemplate = (template) => {
    setTemplateId(template.id);
    setDraft((prev) => ({
      ...prev,
      name: prev.name || `${template.type} ${new Date().getFullYear()}`,
      image: prev.image || getTemplateDefaultImage(template.type),
      imageName: prev.imageName || getTemplateDefaultImageName(template.type),
      discountAmount: template.kind === "fixed" ? prev.discountAmount : "",
    }));
  };

  const handleEdit = (promotion) => {
    setEditingId(promotion.id);
    setTemplateId(getTemplateIdByType(promotion.type));
    setDraft({
      name: promotion.name,
      image: promotion.image || "",
      imageName: promotion.imageName || "",
      scopeTarget: promotion.scopeTarget || "",
      targetProductId: promotion.targetProductId || "",
      discountAmount: promotion.discountAmount ? String(promotion.discountAmount) : "",
      start: promotion.start,
      end: promotion.end,
      stockLimit: promotion.stockLimit ? String(promotion.stockLimit) : "",
    });
    setMessage("");
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Subi un archivo de imagen valido: JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraft((prev) => ({
        ...prev,
        image: typeof reader.result === "string" ? reader.result : prev.image,
        imageName: file.name,
      }));
      setMessage("Imagen cargada correctamente para la promo.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleProductChange = (event) => {
    const nextProductId = event.target.value;
    const nextProduct = products.find((product) => product.id === nextProductId);

    setDraft((prev) => ({
      ...prev,
      targetProductId: nextProductId,
      scopeTarget: nextProduct ? nextProduct.name : prev.scopeTarget,
      image: !prev.image && nextProduct ? nextProduct.image : prev.image,
      imageName:
        !prev.imageName && nextProduct
          ? nextProduct.image.split("/").pop() || prev.imageName
          : prev.imageName,
    }));
  };

  const savePromotion = (event) => {
    event.preventDefault();

    if (!draft.name.trim() || !resolvedScopeTarget || !draft.image.trim()) {
      setMessage("Completa nombre, imagen y objetivo comercial para guardar la promo.");
      return;
    }

    if (activeTemplate.kind === "fixed" && (!selectedProduct || !discountAmount)) {
      setMessage("Para el descuento fijo elegi un producto y defini un monto valido.");
      return;
    }

    const nextPromotion = {
      id: editingId || `promo_${Date.now()}`,
      name: draft.name.trim(),
      type: activeTemplate.type,
      condition:
        activeTemplate.kind === "fixed"
          ? `${formatCurrency(discountAmount)} menos`
          : activeTemplate.condition,
      scopeTarget: resolvedScopeTarget,
      targetProductId: draft.targetProductId || "",
      discountAmount: activeTemplate.kind === "fixed" ? discountAmount : null,
      image: draft.image.trim(),
      imageName: draft.imageName || draft.image.trim().split("/").pop() || "promo",
      start: draft.start,
      end: draft.end,
      stockLimit: draft.stockLimit ? Number(draft.stockLimit) : null,
      active: true,
    };

    setPromotions((prev) =>
      editingId
        ? prev.map((promotion) => (promotion.id === editingId ? nextPromotion : promotion))
        : [nextPromotion, ...prev],
    );

    setMessage(editingId ? "Promo actualizada correctamente." : "Promo creada correctamente.");
    resetDraft();
  };

  const togglePromotion = (id) => {
    setPromotions((prev) =>
      prev.map((promotion) =>
        promotion.id === id ? { ...promotion, active: !promotion.active } : promotion,
      ),
    );
  };

  const removePromotion = (id) => {
    setPromotions((prev) => prev.filter((promotion) => promotion.id !== id));
    if (editingId === id) {
      resetDraft();
    }
    setMessage("Promo eliminada.");
  };

  return (
    <div className="admin-page-root promo-admin-page">
      <header className="admin-page-header">
        <p>Promociones</p>
        <h1>Promos simples para operar rapido</h1>
        <span>
          El sistema queda preparado con promos 2x1, 3x2 y descuento fijo por monto, sin
          porcentajes.
        </span>
      </header>

      <section className="admin-card promo-step-card">
        <div className="promo-step-head">
          <div>
            <h2>1) Elegi el tipo de promo</h2>
            <p>Selecciona el formato comercial que vas a activar para esta campana.</p>
          </div>
        </div>
        <div className="promo-template-grid">
          {promotionTemplates.map((template) => {
            const Icon = template.icon;
            const isActive = template.id === templateId;

            return (
              <button
                type="button"
                key={template.id}
                className={`promo-template-card ${isActive ? "active" : ""}`}
                onClick={() => selectTemplate(template)}
              >
                <div className="promo-template-main">
                  <span className="promo-template-icon">
                    <Icon size={20} />
                  </span>
                  <div className="promo-template-copy">
                    <strong>{template.name}</strong>
                    <small>{template.description}</small>
                  </div>
                </div>
                <span className={`promo-template-check ${isActive ? "active" : ""}`}>
                  <BadgeCheck size={18} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="admin-card promo-step-card">
        <div className="promo-step-head">
          <div>
            <h2>2) Configuracion comercial</h2>
            <p>Completa la informacion principal de la promo y verifica la tarjeta de vista previa.</p>
          </div>
        </div>
        <form className="promo-builder" onSubmit={savePromotion}>
          <div className="promo-builder-fields">
            <label className="promo-wide">
              <span className="promo-field-label">Nombre de la promo</span>
              <div className="promo-input-shell">
                <input
                  type="text"
                  placeholder="Ej: Creatinas 2x1"
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
            </label>

            <div className="promo-static-card">
              <span>Tipo</span>
              <strong>{activeTemplate.type}</strong>
            </div>

            <div className="promo-static-card">
              <span>Condicion comercial</span>
              <strong>
                {activeTemplate.kind === "fixed" && discountAmount
                  ? `${formatCurrency(discountAmount)} menos`
                  : activeTemplate.condition}
              </strong>
            </div>

            <div className="promo-image-grid promo-wide">
              <label className="promo-upload-box">
                <div className="promo-upload-box-head">
                  <span className="promo-upload-icon">
                    <ImagePlus size={18} />
                  </span>
                  <div>
                    <span>Subir imagen</span>
                    <small>Elegi un archivo JPG, PNG o WEBP desde tu compu</small>
                  </div>
                </div>
                <input
                  id="promo-image-file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <div className="promo-upload-row">
                  <span className="promo-upload-trigger">Seleccionar imagen</span>
                  <span className="promo-upload-name">
                    {draft.imageName || "Todavia no cargaste ningun archivo"}
                  </span>
                </div>
              </label>

              <label>
                <span className="promo-field-label">Ruta o URL de imagen</span>
                <div className="promo-input-shell with-icon">
                  <ImagePlus size={16} />
                  <input
                    type="text"
                    placeholder="https://... o /assets/products/..."
                    value={draft.image}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        image: event.target.value,
                        imageName: event.target.value.split("/").pop() || prev.imageName,
                      }))
                    }
                  />
                </div>
              </label>
            </div>

            <label>
              <span className="promo-field-label">
                {activeTemplate.kind === "fixed" ? "Producto con descuento" : "Producto promocionado"}
              </span>
              <div className="promo-input-shell with-icon">
                <Package2 size={16} />
                <select value={draft.targetProductId} onChange={handleProductChange}>
                  <option value="">Selecciona un producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label>
              <span className="promo-field-label">Categoria, marca o linea promocionada</span>
              <div className="promo-input-shell with-icon">
                <Tag size={16} />
                <input
                  type="text"
                  placeholder="Ej: Creatina / Star Nutrition / Whey 2lb"
                  value={draft.scopeTarget}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, scopeTarget: event.target.value }))
                  }
                />
              </div>
            </label>

            {activeTemplate.kind === "fixed" ? (
              <label className="promo-wide">
                <span className="promo-field-label">Monto de descuento</span>
                <div className="promo-input-shell with-icon">
                  <BadgeDollarSign size={16} />
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 5000"
                    value={draft.discountAmount}
                    onChange={(event) =>
                      setDraft((prev) => ({ ...prev, discountAmount: event.target.value }))
                    }
                  />
                </div>
              </label>
            ) : null}

            <label>
              <span className="promo-field-label">Fecha inicio</span>
              <div className="promo-input-shell with-icon">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={draft.start}
                  onChange={(event) => setDraft((prev) => ({ ...prev, start: event.target.value }))}
                />
              </div>
            </label>

            <label>
              <span className="promo-field-label">Fecha fin</span>
              <div className="promo-input-shell with-icon">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={draft.end}
                  onChange={(event) => setDraft((prev) => ({ ...prev, end: event.target.value }))}
                />
              </div>
            </label>

            <label className="promo-wide">
              <span className="promo-field-label">Tope de unidades opcional</span>
              <div className="promo-input-shell with-icon">
                <Package2 size={16} />
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 100"
                  value={draft.stockLimit}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, stockLimit: event.target.value }))
                  }
                />
              </div>
            </label>
          </div>

          <aside className="promo-preview">
            <div className="promo-preview-header">
              <div>
                <h3>Vista previa</h3>
                <p>Asi se veria la promo dentro del panel comercial.</p>
              </div>
              <span className="promo-preview-pill">
                {activeTemplate.kind === "fixed" ? "$ menos" : activeTemplate.type}
              </span>
            </div>

            <article className="promo-preview-card">
              <div className="promo-preview-media">
                {draft.image ? (
                  <img src={draft.image} alt={draft.name || "Promo en vista previa"} />
                ) : (
                  <span>Imagen de promo</span>
                )}
              </div>

              <div className="promo-preview-copy">
                <small className="promo-preview-kicker">Promocion destacada</small>
                <small className="promo-preview-file">
                  Archivo: {draft.imageName || "sin imagen cargada"}
                </small>
                <h4>{draft.name || "Nombre de la promo"}</h4>
                <p className="promo-preview-description">
                  {activeTemplate.kind === "fixed"
                    ? `Descuento directo en ${resolvedScopeTarget || "producto seleccionado"}`
                    : `${activeTemplate.condition} en `}
                  {activeTemplate.kind === "fixed" ? null : <b>{resolvedScopeTarget || "objetivo comercial"}</b>}
                </p>

                {activeTemplate.kind === "fixed" ? (
                  <div className="promo-preview-prices">
                    <span>
                      <b>Precio actual</b>
                      {selectedProduct ? formatCurrency(selectedProduct.price) : "Selecciona un producto"}
                    </span>
                    <span>
                      <b>Precio promo</b>
                      {selectedProduct && discountAmount
                        ? formatCurrency(discountedPreviewPrice)
                        : "Define el descuento"}
                    </span>
                  </div>
                ) : null}

                <div className="promo-preview-meta">
                  <span>
                    <b>Vigencia</b>
                    {draft.start || "sin inicio"} a {draft.end || "sin fin"}
                  </span>
                  <span>
                    <b>{activeTemplate.kind === "fixed" ? "Descuento" : "Tope"}</b>
                    {activeTemplate.kind === "fixed"
                      ? discountAmount
                        ? `${formatCurrency(discountAmount)} menos`
                        : "sin monto definido"
                      : draft.stockLimit
                        ? `${draft.stockLimit} unidades promocionales`
                        : "sin tope"}
                  </span>
                </div>

                <button type="submit">{editingId ? "Guardar cambios" : "Crear promo"}</button>
              </div>
            </article>
          </aside>
        </form>
        {message && <p className="admin-message">{message}</p>}
      </section>

      <section className="admin-card promo-step-card">
        <div className="promo-step-head">
          <div>
            <h2>3) Promos activas</h2>
            <p>Gestiona las campanas cargadas y activa o pausa cada promo en segundos.</p>
          </div>
        </div>
        <div className="promo-list-grid">
          {sortedPromotions.map((promotion) => (
            <article key={promotion.id} className={`promo-item ${promotion.active ? "on" : "off"}`}>
              <div className="promo-item-media">
                <img src={promotion.image} alt={promotion.name} />
              </div>

              <div className="promo-item-content">
                <header>
                  <strong>{promotion.name}</strong>
                  <span>{promotion.active ? "Activa" : "Pausada"}</span>
                </header>
                <p>
                  {promotion.type} - {promotion.condition}
                </p>
                <p>
                  Apunta a: <b>{promotion.scopeTarget}</b>
                </p>
                <small>
                  {promotion.start || "sin inicio"} - {promotion.end || "sin fin"}
                </small>
                {promotion.stockLimit && (
                  <small>Tope promocional: {promotion.stockLimit} unidades</small>
                )}
              </div>

              <div className="promo-actions">
                <button type="button" onClick={() => handleEdit(promotion)}>
                  Editar
                </button>
                <button type="button" onClick={() => togglePromotion(promotion.id)}>
                  {promotion.active ? "Desactivar" : "Activar"}
                </button>
                <button type="button" onClick={() => removePromotion(promotion.id)}>
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AdminPromotionsPage;

import { useMemo, useState } from "react";

const promotionTemplates = [
  {
    id: "percent",
    name: "Descuento %",
    type: "Porcentaje",
    description: "Ideal para rebajas por categoria o producto.",
    defaultValue: "20",
    valueLabel: "% descuento",
  },
  {
    id: "fixed",
    name: "Monto fijo",
    type: "Monto fijo",
    description: "Descuento fijo en pesos.",
    defaultValue: "5000",
    valueLabel: "$ descuento",
  },
  {
    id: "combo",
    name: "Combo",
    type: "Combo",
    description: "Precio especial por pack de productos.",
    defaultValue: "Pack 2 productos",
    valueLabel: "Detalle combo",
  },
  {
    id: "twoforone",
    name: "2x1",
    type: "2x1",
    description: "Llevas 2 y pagas 1.",
    defaultValue: "2x1",
    valueLabel: "Condicion",
  },
  {
    id: "gift",
    name: "Regalo",
    type: "Regalo por compra",
    description: "Regalo automatico segun monto o producto.",
    defaultValue: "Shaker de regalo",
    valueLabel: "Beneficio",
  },
  {
    id: "shipping",
    name: "Envio gratis",
    type: "Envio",
    description: "Bonifica envio desde cierto monto.",
    defaultValue: "Desde $120000",
    valueLabel: "Condicion",
  },
];

const initialPromotions = [
  {
    id: "promo1",
    name: "Marzo Fuerza Creatina",
    type: "Porcentaje",
    value: "25%",
    scopeType: "Categoria",
    scopeTarget: "Creatina",
    start: "2026-03-01",
    end: "2026-03-31",
    priority: 1,
    active: true,
  },
  {
    id: "promo2",
    name: "Combo Whey + Creatina",
    type: "Combo",
    value: "Pack especial",
    scopeType: "Producto",
    scopeTarget: "Whey + Creatina",
    start: "2026-03-05",
    end: "2026-04-15",
    priority: 2,
    active: true,
  },
  {
    id: "promo3",
    name: "Envio gratis",
    type: "Envio",
    value: "Desde $120000",
    scopeType: "Tienda",
    scopeTarget: "Toda la tienda",
    start: "2026-01-01",
    end: "2026-12-31",
    priority: 3,
    active: true,
  },
];

function formatValue(template, rawValue) {
  if (template.type === "Porcentaje") {
    return `${rawValue}%`;
  }
  if (template.type === "Monto fijo") {
    return `$${rawValue}`;
  }
  return rawValue;
}

function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [templateId, setTemplateId] = useState("percent");
  const activeTemplate = useMemo(
    () => promotionTemplates.find((template) => template.id === templateId) || promotionTemplates[0],
    [templateId],
  );

  const [draft, setDraft] = useState({
    name: "",
    value: "20",
    scopeType: "Categoria",
    scopeTarget: "",
    start: "",
    end: "",
    priority: 5,
  });

  const selectTemplate = (template) => {
    setTemplateId(template.id);
    setDraft((prev) => ({
      ...prev,
      value: template.defaultValue,
      name: prev.name || `${template.type} ${new Date().getFullYear()}`,
    }));
  };

  const createPromotion = (event) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.value.trim() || !draft.scopeTarget.trim()) {
      return;
    }

    const value = formatValue(activeTemplate, draft.value.trim());

    setPromotions((prev) => [
      {
        id: `promo_${Date.now()}`,
        name: draft.name.trim(),
        type: activeTemplate.type,
        value,
        scopeType: draft.scopeType,
        scopeTarget: draft.scopeTarget.trim(),
        start: draft.start,
        end: draft.end,
        priority: Number(draft.priority || 5),
        active: true,
      },
      ...prev,
    ]);

    setDraft({
      name: "",
      value: activeTemplate.defaultValue,
      scopeType: "Categoria",
      scopeTarget: "",
      start: "",
      end: "",
      priority: 5,
    });
  };

  const togglePromotion = (id) => {
    setPromotions((prev) =>
      prev.map((promotion) =>
        promotion.id === id ? { ...promotion, active: !promotion.active } : promotion,
      ),
    );
  };

  const setPriority = (id, direction) => {
    setPromotions((prev) =>
      prev.map((promotion) => {
        if (promotion.id !== id) {
          return promotion;
        }
        const nextPriority = direction === "up" ? promotion.priority - 1 : promotion.priority + 1;
        return { ...promotion, priority: Math.max(1, Math.min(10, nextPriority)) };
      }),
    );
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Promociones</p>
        <h1>Constructor intuitivo de promociones</h1>
        <span>
          Elegi una plantilla, completa los datos clave y previsualiza la promo antes de activarla.
        </span>
      </header>

      <section className="admin-card">
        <h2>1) Elegi el tipo de promocion</h2>
        <div className="promo-template-grid">
          {promotionTemplates.map((template) => (
            <button
              type="button"
              key={template.id}
              className={`promo-template-card ${template.id === templateId ? "active" : ""}`}
              onClick={() => selectTemplate(template)}
            >
              <strong>{template.name}</strong>
              <small>{template.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>2) Configuracion de la promo</h2>
        <form className="promo-builder" onSubmit={createPromotion}>
          <label>
            Nombre promocion
            <input
              type="text"
              placeholder="Ej: Semana Creatina"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            Tipo seleccionado
            <input type="text" value={activeTemplate.type} readOnly />
          </label>

          <label>
            {activeTemplate.valueLabel}
            <input
              type="text"
              value={draft.value}
              onChange={(event) => setDraft((prev) => ({ ...prev, value: event.target.value }))}
            />
          </label>

          <label>
            Aplica sobre
            <select
              value={draft.scopeType}
              onChange={(event) => setDraft((prev) => ({ ...prev, scopeType: event.target.value }))}
            >
              <option value="Categoria">Categoria</option>
              <option value="Marca">Marca</option>
              <option value="Producto">Producto</option>
              <option value="Tienda">Tienda completa</option>
            </select>
          </label>

          <label>
            Objetivo promocional
            <input
              type="text"
              placeholder="Ej: Creatina / Star Nutrition / Whey 2lb"
              value={draft.scopeTarget}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, scopeTarget: event.target.value }))
              }
            />
          </label>

          <label>
            Prioridad (1 alta - 10 baja)
            <input
              type="number"
              min="1"
              max="10"
              value={draft.priority}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, priority: Number(event.target.value || 5) }))
              }
            />
          </label>

          <label>
            Fecha inicio
            <input
              type="date"
              value={draft.start}
              onChange={(event) => setDraft((prev) => ({ ...prev, start: event.target.value }))}
            />
          </label>

          <label>
            Fecha fin
            <input
              type="date"
              value={draft.end}
              onChange={(event) => setDraft((prev) => ({ ...prev, end: event.target.value }))}
            />
          </label>

          <div className="promo-preview">
            <h3>Vista previa</h3>
            <p>
              <b>{draft.name || "Nombre promocion"}</b>
            </p>
            <p>
              {activeTemplate.type} {formatValue(activeTemplate, draft.value || "-")} en
              {" "}
              {draft.scopeType.toLowerCase()}: <b>{draft.scopeTarget || "objetivo"}</b>
            </p>
            <p>
              Vigencia: {draft.start || "sin inicio"} a {draft.end || "sin fin"}
            </p>
            <button type="submit">Crear promocion</button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>3) Promociones activas y prioridad</h2>
        <div className="promo-list-grid">
          {promotions
            .slice()
            .sort((a, b) => a.priority - b.priority)
            .map((promotion) => (
              <article key={promotion.id} className={`promo-item ${promotion.active ? "on" : "off"}`}>
                <header>
                  <strong>{promotion.name}</strong>
                  <span>Prioridad {promotion.priority}</span>
                </header>
                <p>
                  {promotion.type} {promotion.value}
                </p>
                <p>
                  {promotion.scopeType}: <b>{promotion.scopeTarget}</b>
                </p>
                <small>
                  {promotion.start || "sin inicio"} - {promotion.end || "sin fin"}
                </small>
                <div className="promo-actions">
                  <button type="button" onClick={() => togglePromotion(promotion.id)}>
                    {promotion.active ? "Desactivar" : "Activar"}
                  </button>
                  <button type="button" onClick={() => setPriority(promotion.id, "up")}>Subir</button>
                  <button type="button" onClick={() => setPriority(promotion.id, "down")}>Bajar</button>
                </div>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}

export default AdminPromotionsPage;

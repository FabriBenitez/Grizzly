import { useMemo, useState } from "react";

const promotionTemplates = [
  {
    id: "twoforone",
    name: "2x1",
    type: "2x1",
    description: "Llevas 2 unidades y pagas 1.",
    condition: "Llevando 2, paga 1",
    units: 2,
    billedUnits: 1,
  },
  {
    id: "threefortwo",
    name: "3x2",
    type: "3x2",
    description: "Llevas 3 unidades y pagas 2.",
    condition: "Llevando 3, paga 2",
    units: 3,
    billedUnits: 2,
  },
];

const initialPromotions = [
  {
    id: "promo1",
    name: "Creatinas 2x1 de lanzamiento",
    type: "2x1",
    condition: "Llevando 2, paga 1",
    scopeType: "Categoria",
    scopeTarget: "Creatina",
    start: "2026-04-01",
    end: "2026-04-30",
    priority: 1,
    active: true,
  },
  {
    id: "promo2",
    name: "Whey 3x2 para clientes frecuentes",
    type: "3x2",
    condition: "Llevando 3, paga 2",
    scopeType: "Marca",
    scopeTarget: "Star Nutrition",
    start: "2026-04-05",
    end: "2026-05-10",
    priority: 2,
    active: true,
  },
];

function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [templateId, setTemplateId] = useState("twoforone");
  const activeTemplate = useMemo(
    () => promotionTemplates.find((template) => template.id === templateId) || promotionTemplates[0],
    [templateId],
  );

  const [draft, setDraft] = useState({
    name: "",
    scopeType: "Categoria",
    scopeTarget: "",
    start: "",
    end: "",
    priority: 5,
    stockLimit: "",
  });

  const selectTemplate = (template) => {
    setTemplateId(template.id);
    setDraft((prev) => ({
      ...prev,
      name: prev.name || `${template.type} ${new Date().getFullYear()}`,
    }));
  };

  const createPromotion = (event) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.scopeTarget.trim()) {
      return;
    }

    setPromotions((prev) => [
      {
        id: `promo_${Date.now()}`,
        name: draft.name.trim(),
        type: activeTemplate.type,
        condition: activeTemplate.condition,
        scopeType: draft.scopeType,
        scopeTarget: draft.scopeTarget.trim(),
        start: draft.start,
        end: draft.end,
        priority: Number(draft.priority || 5),
        stockLimit: draft.stockLimit ? Number(draft.stockLimit) : null,
        active: true,
      },
      ...prev,
    ]);

    setDraft({
      name: "",
      scopeType: "Categoria",
      scopeTarget: "",
      start: "",
      end: "",
      priority: 5,
      stockLimit: "",
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
        <h1>Promos simples para operar rapido</h1>
        <span>
          El sistema queda preparado solo con promos 2x1 y 3x2, sin descuentos por porcentaje ni
          monto fijo.
        </span>
      </header>

      <section className="admin-card">
        <h2>1) Elegi el tipo de promo</h2>
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
        <h2>2) Configuracion comercial</h2>
        <form className="promo-builder" onSubmit={createPromotion}>
          <label>
            Nombre de la promo
            <input
              type="text"
              placeholder="Ej: Creatinas 2x1"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            Tipo
            <input type="text" value={activeTemplate.type} readOnly />
          </label>

          <label>
            Condicion comercial
            <input type="text" value={activeTemplate.condition} readOnly />
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
            </select>
          </label>

          <label>
            Objetivo comercial
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

          <label>
            Tope de unidades opcional
            <input
              type="number"
              min="0"
              placeholder="Ej: 100"
              value={draft.stockLimit}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, stockLimit: event.target.value }))
              }
            />
          </label>

          <div className="promo-preview">
            <h3>Vista previa</h3>
            <p>
              <b>{draft.name || "Nombre de la promo"}</b>
            </p>
            <p>
              {activeTemplate.condition} en {draft.scopeType.toLowerCase()}:{" "}
              <b>{draft.scopeTarget || "objetivo"}</b>
            </p>
            <p>
              Vigencia: {draft.start || "sin inicio"} a {draft.end || "sin fin"}
            </p>
            <p>
              Tope: {draft.stockLimit ? `${draft.stockLimit} unidades promocionales` : "sin tope"}
            </p>
            <button type="submit">Crear promo</button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>3) Promos activas y prioridad</h2>
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
                  {promotion.type} - {promotion.condition}
                </p>
                <p>
                  {promotion.scopeType}: <b>{promotion.scopeTarget}</b>
                </p>
                <small>
                  {promotion.start || "sin inicio"} - {promotion.end || "sin fin"}
                </small>
                {promotion.stockLimit && (
                  <small>Tope promocional: {promotion.stockLimit} unidades</small>
                )}
                <div className="promo-actions">
                  <button type="button" onClick={() => togglePromotion(promotion.id)}>
                    {promotion.active ? "Desactivar" : "Activar"}
                  </button>
                  <button type="button" onClick={() => setPriority(promotion.id, "up")}>
                    Subir
                  </button>
                  <button type="button" onClick={() => setPriority(promotion.id, "down")}>
                    Bajar
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

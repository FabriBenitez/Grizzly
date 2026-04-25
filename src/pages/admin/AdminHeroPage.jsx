import { useMemo, useState } from "react";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { heroPromoSlides } from "../../data/homePromos";
import { HERO_SLIDES_STORAGE_KEY, normalizeHeroSlides } from "../../utils/heroSlides";

const baseDraft = {
  id: "",
  image: "",
  kicker: "",
  titleLead: "",
  titleHighlight: "",
  titleTail: "",
  description: "",
  badgesText: "",
  statsText: "",
  active: true,
  order: 1,
};

function slideToDraft(slide) {
  return {
    id: slide.id,
    image: slide.image,
    kicker: slide.kicker,
    titleLead: slide.titleLead,
    titleHighlight: slide.titleHighlight,
    titleTail: slide.titleTail,
    description: slide.description,
    badgesText: slide.badges.join(", "),
    statsText: slide.stats.join(", "),
    active: slide.active,
    order: slide.order,
  };
}

function draftToSlide(draft) {
  return {
    id: draft.id || `hero_${Date.now()}`,
    image: draft.image.trim(),
    kicker: draft.kicker.trim(),
    titleLead: draft.titleLead.trim(),
    titleHighlight: draft.titleHighlight.trim(),
    titleTail: draft.titleTail.trim(),
    description: draft.description.trim(),
    badges: draft.badgesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    stats: draft.statsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    active: draft.active,
    order: Number(draft.order || 1),
  };
}

function AdminHeroPage() {
  const [slides, setSlides] = useLocalStorage(
    HERO_SLIDES_STORAGE_KEY,
    normalizeHeroSlides(heroPromoSlides),
  );
  const [draft, setDraft] = useState(() => slideToDraft(normalizeHeroSlides(heroPromoSlides)[0]));
  const [message, setMessage] = useState("");

  const orderedSlides = useMemo(() => normalizeHeroSlides(slides), [slides]);
  const activeSlides = useMemo(
    () => orderedSlides.filter((slide) => slide.active),
    [orderedSlides],
  );

  const resetDraft = () => {
    setDraft({
      ...baseDraft,
      order: orderedSlides.length + 1,
      badgesText: "2x1 en destacados, 3x2 en seleccionados",
      statsText: "Marcas oficiales, Atencion personalizada, Envios a todo el pais",
    });
  };

  const handleEdit = (slide) => {
    setDraft(slideToDraft(slide));
    setMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.image.trim() || !draft.titleHighlight.trim() || !draft.description.trim()) {
      setMessage("Completa imagen, titulo principal y descripcion para guardar el banner.");
      return;
    }

    const nextSlide = draftToSlide(draft);
    setSlides((prev) => {
      const exists = prev.some((slide) => slide.id === nextSlide.id);
      const nextSlides = exists
        ? prev.map((slide) => (slide.id === nextSlide.id ? nextSlide : slide))
        : [...prev, nextSlide];
      return normalizeHeroSlides(nextSlides);
    });
    setMessage(draft.id ? "Banner actualizado correctamente." : "Banner creado correctamente.");
    resetDraft();
  };

  const toggleSlide = (id) => {
    setSlides((prev) =>
      normalizeHeroSlides(
        prev.map((slide) => (slide.id === id ? { ...slide, active: !slide.active } : slide)),
      ),
    );
  };

  const removeSlide = (id) => {
    setSlides((prev) => {
      const nextSlides = prev.filter((slide) => slide.id !== id);
      return normalizeHeroSlides(nextSlides.length ? nextSlides : heroPromoSlides);
    });
    setMessage("Banner eliminado del hero.");
    resetDraft();
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Hero</p>
        <h1>ABM del carrusel principal</h1>
        <span>
          Carga, edita, activa, desactiva y ordena los banners que se muestran en el hero del home.
        </span>
      </header>

      <section className="admin-kpi-grid">
        <article>
          <p>Banners totales</p>
          <strong>{orderedSlides.length}</strong>
        </article>
        <article>
          <p>Banners activos</p>
          <strong>{activeSlides.length}</strong>
        </article>
        <article>
          <p>Inactivos</p>
          <strong>{Math.max(0, orderedSlides.length - activeSlides.length)}</strong>
        </article>
        <article>
          <p>Uso sugerido</p>
          <strong>3 a 5 slides</strong>
        </article>
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <div className="admin-card-title">
            <h2>Banners cargados</h2>
            <button type="button" className="admin-secondary-btn" onClick={resetDraft}>
              Nuevo banner
            </button>
          </div>
          <div className="hero-admin-list">
            {orderedSlides.map((slide) => (
              <article key={slide.id} className={`hero-admin-card ${slide.active ? "on" : "off"}`}>
                <img src={slide.image} alt={slide.titleHighlight} />
                <div>
                  <strong>
                    {slide.titleLead} {slide.titleHighlight}
                  </strong>
                  <small>Orden {slide.order}</small>
                  <small>{slide.kicker}</small>
                </div>
                <div className="promo-actions">
                  <button type="button" onClick={() => handleEdit(slide)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => toggleSlide(slide.id)}>
                    {slide.active ? "Desactivar" : "Activar"}
                  </button>
                  <button type="button" onClick={() => removeSlide(slide.id)}>
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="admin-card">
          <h2>{draft.id ? "Editar banner" : "Alta de banner"}</h2>
          <form className="hero-admin-form" onSubmit={handleSubmit}>
            <label>
              URL de imagen
              <input
                type="url"
                placeholder="https://..."
                value={draft.image}
                onChange={(event) => setDraft((prev) => ({ ...prev, image: event.target.value }))}
              />
            </label>
            <label>
              Kicker
              <input
                type="text"
                value={draft.kicker}
                onChange={(event) => setDraft((prev) => ({ ...prev, kicker: event.target.value }))}
              />
            </label>
            <label>
              Titulo linea 1
              <input
                type="text"
                value={draft.titleLead}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, titleLead: event.target.value }))
                }
              />
            </label>
            <label>
              Titulo destacado
              <input
                type="text"
                value={draft.titleHighlight}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, titleHighlight: event.target.value }))
                }
              />
            </label>
            <label>
              Titulo linea 3
              <input
                type="text"
                value={draft.titleTail}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, titleTail: event.target.value }))
                }
              />
            </label>
            <label>
              Orden
              <input
                type="number"
                min="1"
                value={draft.order}
                onChange={(event) => setDraft((prev) => ({ ...prev, order: event.target.value }))}
              />
            </label>
            <label className="hero-admin-wide">
              Descripcion
              <textarea
                rows="3"
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </label>
            <label className="hero-admin-wide">
              Badges separados por coma
              <input
                type="text"
                value={draft.badgesText}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, badgesText: event.target.value }))
                }
              />
            </label>
            <label className="hero-admin-wide">
              Stats separadas por coma
              <input
                type="text"
                value={draft.statsText}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, statsText: event.target.value }))
                }
              />
            </label>
            <label className="switch-inline">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft((prev) => ({ ...prev, active: event.target.checked }))}
              />
              <span>Banner activo en el home</span>
            </label>
            <div className="hero-admin-actions">
              <button type="submit">{draft.id ? "Guardar cambios" : "Crear banner"}</button>
              <button type="button" className="admin-secondary-btn" onClick={resetDraft}>
                Limpiar formulario
              </button>
            </div>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </article>
      </section>

      <section className="admin-card">
        <h2>Vista previa</h2>
        <article
          className="hero-admin-preview"
          style={{ "--hero-preview": `url("${draft.image || activeSlides[0]?.image || "/assets/products/combo-estrella.jpg"}")` }}
        >
          <div className="hero-admin-preview-copy">
            <p>{draft.kicker || "Grizzly suplementos"}</p>
            <h3>
              <span>{draft.titleLead || "Encontra"}</span>
              <strong>{draft.titleHighlight || "tu proximo banner"}</strong>
              <em>{draft.titleTail || "principal"}</em>
            </h3>
            <small>{draft.description || "Este bloque te muestra como se va a ver el hero."}</small>
          </div>
        </article>
      </section>
    </div>
  );
}

export default AdminHeroPage;

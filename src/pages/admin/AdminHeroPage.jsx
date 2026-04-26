import { useMemo, useState } from "react";
import { Eye, EyeOff, ImagePlus, LayoutTemplate, Rows3 } from "lucide-react";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { heroPromoSlides } from "../../data/homePromos";
import { HERO_SLIDES_STORAGE_KEY, normalizeHeroSlides } from "../../utils/heroSlides";

const baseDraft = {
  id: "",
  image: "",
  active: true,
  order: 1,
};

function slideToDraft(slide) {
  return {
    id: slide.id,
    image: slide.image,
    active: slide.active,
    order: slide.order,
  };
}

function draftToSlide(draft) {
  return {
    id: draft.id || `hero_${Date.now()}`,
    image: draft.image.trim(),
    kicker: "",
    titleLead: "",
    titleHighlight: "",
    titleTail: "",
    description: "",
    badges: [],
    stats: [],
    showOverlay: false,
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
    });
  };

  const handleEdit = (slide) => {
    setDraft(slideToDraft(slide));
    setMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.image.trim()) {
      setMessage("Completa la imagen del banner para guardarlo.");
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
        <h1>Gestion simple de banners</h1>
        <span>
          Carga la imagen del banner, ordenala y activala para mostrarla en el carrusel principal.
        </span>
      </header>

      <section className="admin-kpi-grid">
        <AdminStatCard
          icon={LayoutTemplate}
          title="Banners totales"
          value={orderedSlides.length}
          helper="Cantidad administrada desde este modulo."
        />
        <AdminStatCard
          icon={Eye}
          title="Banners activos"
          value={activeSlides.length}
          helper="Se muestran hoy dentro del home."
        />
        <AdminStatCard
          icon={EyeOff}
          title="Inactivos"
          value={Math.max(0, orderedSlides.length - activeSlides.length)}
          helper="Guardados pero pausados comercialmente."
          tone="warn"
        />
        <AdminStatCard
          icon={Rows3}
          title="Uso sugerido"
          value="3 a 5 slides"
          helper="Volumen ideal para mantener impacto visual."
          tone="highlight"
        />
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">CMS visual</span>
              <h2>Banners cargados</h2>
            </div>
            <button type="button" className="admin-secondary-btn" onClick={resetDraft}>
              Nuevo banner
            </button>
          </div>
          <div className="hero-admin-list">
            {orderedSlides.map((slide) => (
              <article key={slide.id} className={`hero-admin-card ${slide.active ? "on" : "off"}`}>
                <img src={slide.image} alt={`Banner ${slide.order}`} />
                <div>
                  <strong>Banner #{slide.order}</strong>
                  <small>Orden {slide.order}</small>
                  <small>{slide.active ? "Visible en el home" : "Pausado"}</small>
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
          <div className="admin-card-title">
            <div>
              <span className="admin-card-kicker">Edicion</span>
              <h2>{draft.id ? "Actualizar banner" : "Cargar banner"}</h2>
            </div>
          </div>
          <form className="hero-admin-form" onSubmit={handleSubmit}>
            <label className="hero-admin-wide">
              URL de imagen
              <input
                type="url"
                placeholder="https://..."
                value={draft.image}
                onChange={(event) => setDraft((prev) => ({ ...prev, image: event.target.value }))}
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
            <label className="switch-inline">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft((prev) => ({ ...prev, active: event.target.checked }))}
              />
              <span>Banner activo en el home</span>
            </label>
            <p className="hero-admin-helper">
              Este modulo administra solo la imagen del banner. El slide se muestra limpio, sin
              textos superpuestos.
            </p>
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
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Preview</span>
            <h2>Vista previa del banner</h2>
          </div>
        </div>
        <article
          className="hero-admin-preview"
          style={{ "--hero-preview": `url("${draft.image || activeSlides[0]?.image || "/assets/products/combo-estrella.jpg"}")` }}
        >
          <div className="hero-admin-preview-copy">
            <p>Vista previa del banner</p>
            <h3>
              <strong>{draft.active ? "Banner activo" : "Banner pausado"}</strong>
            </h3>
            <small>Orden {draft.order || 1} dentro del carrusel principal.</small>
          </div>
        </article>
      </section>
    </div>
  );
}

export default AdminHeroPage;

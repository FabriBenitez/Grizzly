import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LayoutTemplate, Rows3 } from "lucide-react";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { fetchHeroSlidesFromSupabase, upsertHeroBanner, deleteHeroBanner } from "../../utils/hero.remote";
import { getDefaultHeroSlides } from "../../utils/heroSlides";

const baseDraft = {
  id: "",
  title: "",
  subtitle: "",
  image: "",
  ctaLabel: "",
  ctaHref: "/catalogo",
  active: true,
  order: 1,
};

function slideToDraft(slide) {
  return {
    id: slide.id,
    title: slide.title || slide.titleHighlight || "",
    subtitle: slide.description || "",
    image: slide.image,
    ctaLabel: slide.ctaLabel || "",
    ctaHref: slide.ctaHref || "/catalogo",
    active: slide.active,
    order: slide.order,
  };
}

function draftToSlide(draft) {
  return {
    id: draft.id || "",
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim(),
    image: draft.image.trim(),
    ctaLabel: draft.ctaLabel.trim(),
    ctaHref: draft.ctaHref.trim(),
    active: draft.active,
    order: Number(draft.order || 1),
  };
}

function AdminHeroPage() {
  const [slides, setSlides] = useState(() => getDefaultHeroSlides());
  const [draft, setDraft] = useState(() => slideToDraft(getDefaultHeroSlides()[0]));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const orderedSlides = useMemo(
    () => [...slides].sort((left, right) => left.order - right.order),
    [slides],
  );
  const activeSlides = useMemo(
    () => orderedSlides.filter((slide) => slide.active),
    [orderedSlides],
  );

  const loadSlides = async () => {
    setLoading(true);
    try {
      const remoteSlides = await fetchHeroSlidesFromSupabase({ includeInactive: true });
      setSlides(remoteSlides);
      setMessage("");
    } catch (loadError) {
      setSlides(getDefaultHeroSlides());
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar los banners reales. Mostrando fallback local.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlides();
  }, []);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.image.trim()) {
      setMessage("Completa la imagen del banner para guardarlo.");
      return;
    }

    setSaving(true);
    try {
      await upsertHeroBanner(draftToSlide(draft));
      await loadSlides();
      setMessage(draft.id ? "Banner actualizado correctamente." : "Banner creado correctamente.");
      resetDraft();
    } catch (saveError) {
      setMessage(
        saveError instanceof Error
          ? saveError.message
          : "No pudimos guardar el banner en la base.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleSlide = async (slide) => {
    setSaving(true);
    try {
      await upsertHeroBanner({
        ...slideToDraft(slide),
        active: !slide.active,
      });
      await loadSlides();
      setMessage("Estado del banner actualizado.");
    } catch (toggleError) {
      setMessage(
        toggleError instanceof Error
          ? toggleError.message
          : "No pudimos actualizar el estado del banner.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeSlide = async (id) => {
    setSaving(true);
    try {
      await deleteHeroBanner(id);
      await loadSlides();
      setMessage("Banner eliminado del hero.");
      resetDraft();
    } catch (removeError) {
      setMessage(
        removeError instanceof Error
          ? removeError.message
          : "No pudimos eliminar el banner del hero.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Hero</p>
        <h1>Gestion real de banners</h1>
        <span>
          Carga la imagen, el mensaje principal y la accion comercial para mostrar el carrusel del
          home desde Supabase.
        </span>
      </header>

      {loading && <section className="admin-demo-note">Cargando banners reales...</section>}
      {!loading && message && <section className="admin-demo-note">{message}</section>}

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
                <img src={slide.image} alt={slide.title || `Banner ${slide.order}`} />
                <div>
                  <strong>{slide.title || `Banner #${slide.order}`}</strong>
                  <small>Orden {slide.order}</small>
                  <small>{slide.active ? "Visible en el home" : "Pausado"}</small>
                </div>
                <div className="promo-actions">
                  <button type="button" onClick={() => handleEdit(slide)} disabled={saving}>
                    Editar
                  </button>
                  <button type="button" onClick={() => toggleSlide(slide)} disabled={saving}>
                    {slide.active ? "Desactivar" : "Activar"}
                  </button>
                  <button type="button" onClick={() => removeSlide(slide.id)} disabled={saving}>
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
              Titulo
              <input
                type="text"
                placeholder="Ej: Lanzamientos de la semana"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              />
            </label>
            <label className="hero-admin-wide">
              Subtitulo
              <textarea
                rows="3"
                placeholder="Mensaje breve para acompanar el banner"
                value={draft.subtitle}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, subtitle: event.target.value }))
                }
              />
            </label>
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
              CTA label
              <input
                type="text"
                placeholder="Ej: Ver catalogo"
                value={draft.ctaLabel}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, ctaLabel: event.target.value }))
                }
              />
            </label>
            <label>
              CTA destino
              <input
                type="text"
                placeholder="/catalogo"
                value={draft.ctaHref}
                onChange={(event) => setDraft((prev) => ({ ...prev, ctaHref: event.target.value }))}
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
              Todo lo que edites aqui impacta en el carrusel principal del home y deja de depender
              de localStorage.
            </p>
            <div className="hero-admin-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : draft.id ? "Guardar cambios" : "Crear banner"}
              </button>
              <button type="button" className="admin-secondary-btn" onClick={resetDraft} disabled={saving}>
                Limpiar formulario
              </button>
            </div>
          </form>
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
            <p>{draft.title || "Vista previa del banner"}</p>
            <h3>
              <strong>{draft.active ? "Banner activo" : "Banner pausado"}</strong>
            </h3>
            <small>{draft.subtitle || "Agrega un subtitulo para reforzar el mensaje comercial."}</small>
          </div>
        </article>
      </section>
    </div>
  );
}

export default AdminHeroPage;

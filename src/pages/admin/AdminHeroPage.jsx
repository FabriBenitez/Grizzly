import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LayoutTemplate, Rows3 } from "lucide-react";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { fetchHeroSlidesFromSupabase, upsertHeroBanner, deleteHeroBanner, uploadHeroImage } from "../../utils/hero.remote";
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
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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
      setSuccessMessage("");
      setErrorMessage("");
    } catch (loadError) {
      setSlides(getDefaultHeroSlides());
      setErrorMessage(
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
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleEdit = (slide) => {
    setDraft(slideToDraft(slide));
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setSuccessMessage("Subiendo imagen...");
    setErrorMessage("");
    try {
      const publicUrl = await uploadHeroImage(file);
      setDraft((prev) => ({ ...prev, image: publicUrl }));
      setSuccessMessage("Imagen subida. Ya puedes guardar el banner.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error al subir la imagen");
      setSuccessMessage("");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    if (!draft.image.trim()) {
      setErrorMessage("Completa la imagen del banner para guardarlo.");
      return;
    }

    setSaving(true);
    try {
      await upsertHeroBanner(draftToSlide(draft));
      await loadSlides();
      setSuccessMessage(draft.id ? "Banner actualizado correctamente." : "Banner creado correctamente.");
      resetDraft();
    } catch (saveError) {
      setErrorMessage(
        saveError instanceof Error
          ? saveError.message
          : "No pudimos guardar el banner en la base.",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleSlide = async (slide) => {
    setSuccessMessage("");
    setErrorMessage("");
    setSaving(true);
    try {
      await upsertHeroBanner({
        ...slideToDraft(slide),
        active: !slide.active,
      });
      await loadSlides();
      setSuccessMessage("Estado del banner actualizado.");
    } catch (toggleError) {
      setErrorMessage(
        toggleError instanceof Error
          ? toggleError.message
          : "No pudimos actualizar el estado del banner.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeSlide = async (id) => {
    setSuccessMessage("");
    setErrorMessage("");
    setSaving(true);
    try {
      await deleteHeroBanner(id);
      await loadSlides();
      setSuccessMessage("Banner eliminado del hero.");
      resetDraft();
    } catch (removeError) {
      setErrorMessage(
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
          Banners cargados.
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
          </>
        )}
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
            {loading ? (
              [...Array(2)].map((_, i) => (
                <article key={i} className="hero-admin-card off">
                  <div className="skeleton" style={{ width: 120, height: 80, borderRadius: 14 }}></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                    <div className="skeleton skeleton-title" style={{ width: "50%", margin: 0 }}></div>
                    <div className="skeleton skeleton-text" style={{ width: "30%", margin: 0, height: 10 }}></div>
                    <div className="skeleton skeleton-text" style={{ width: "40%", margin: 0, height: 10 }}></div>
                  </div>
                </article>
              ))
            ) : (
              orderedSlides.map((slide) => (
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
              ))
            )}
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
              Imagen del banner (desde tu PC)
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={saving || loading}
              />
              {draft.image && (
                <small style={{ display: "block", marginTop: 4, color: "var(--green-700)" }}>
                  Imagen cargada correctamente.
                </small>
              )}
            </label>

            <label>
              Orden
              <input
                type="number"
                min="1"
                value={draft.order}
                onChange={(event) => setDraft((prev) => ({ ...prev, order: event.target.value }))}
                disabled={loading}
              />
            </label>
            <label className="switch-inline">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft((prev) => ({ ...prev, active: event.target.checked }))}
                disabled={loading}
              />
              <span>Banner activo en el home</span>
            </label>
  
            <div className="hero-admin-actions">
              <button type="submit" disabled={saving || loading}>
                {saving ? "Guardando..." : draft.id ? "Guardar cambios" : "Crear banner"}
              </button>
              <button type="button" className="admin-secondary-btn" onClick={resetDraft} disabled={saving || loading}>
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
        />
      </section>
    </div>
  );
}

export default AdminHeroPage;

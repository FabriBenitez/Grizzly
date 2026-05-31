import { useEffect, useState } from "react";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import { fetchFaqs, saveFaq, deleteFaq } from "../../utils/faqs.remote";
import { useAuthSupabase } from "../../shared/auth/AuthSupabaseProvider";

function AdminFaqPage() {
  const { puedeIniciarSesion, esAdmin } = useAuthSupabase();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ id: null, question: "", answer: "", is_active: true, sort_order: 1 });

  const loadFaqs = async () => {
    if (!puedeIniciarSesion || !esAdmin) return;
    setLoading(true);
    try {
      const data = await fetchFaqs({ includeInactive: true });
      setFaqs(data);
      setError("");
    } catch (err) {
      setError(err.message || "Error al cargar las FAQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeIniciarSesion, esAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!draft.question.trim() || !draft.answer.trim()) return;

    setSaving(true);
    setError("");
    try {
      await saveFaq(draft);
      await loadFaqs();
      setDraft({ id: null, question: "", answer: "", is_active: true, sort_order: faqs.length + 2 });
    } catch (err) {
      setError(err.message || "No pudimos guardar la FAQ");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (faq) => {
    setDraft({ ...faq });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta pregunta?")) return;
    setError("");
    try {
      await deleteFaq(id);
      await loadFaqs();
      if (draft.id === id) {
        setDraft({ id: null, question: "", answer: "", is_active: true, sort_order: faqs.length });
      }
    } catch (err) {
      setError(err.message || "No pudimos eliminar la FAQ");
    }
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <div className="admin-page-header-meta">
          <HelpCircle size={24} strokeWidth={1.5} />
          <span>Configuraciones</span>
        </div>
        <p>Preguntas Frecuentes</p>
        <h1>Gestion de FAQs</h1>
        <span>Crea y edita las preguntas frecuentes que se muestran a los clientes.</span>
      </header>

      {!loading && error && <div className="admin-message error" style={{ margin: "12px 0 0" }}>{error}</div>}

      <div className="admin-split-layout">
        <section className="admin-split-main">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <article key={i} className="admin-card" style={{ marginBottom: 16 }}>
                <div className="skeleton skeleton-title" style={{ width: "60%", margin: 0 }}></div>
                <div className="skeleton skeleton-text" style={{ width: "90%", marginTop: 12 }}></div>
                <div className="skeleton skeleton-text" style={{ width: "40%", marginTop: 6 }}></div>
              </article>
            ))
          ) : faqs.length === 0 && !error ? (
            <div className="admin-card">
              <p>No hay preguntas frecuentes registradas todavia.</p>
            </div>
          ) : (
            faqs.map((faq) => (
              <article key={faq.id} className="admin-card" style={{ marginBottom: 16 }}>
                <div className="admin-card-header">
                  <h3>{faq.question}</h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span className={`admin-status-badge ${faq.is_active ? "delivered" : "cancelled"}`}>
                      {faq.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                </div>
                <p style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "#666" }}>{faq.answer}</p>
                <div className="admin-card-actions" style={{ marginTop: 16 }}>
                  <button type="button" onClick={() => handleEdit(faq)} className="admin-button-secondary">
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDelete(faq.id)} className="admin-button-danger">
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </section>

        <aside className="admin-split-sidebar">
          <form onSubmit={handleSubmit} className="admin-card sticky-sidebar">
            <h2 className="admin-card-title">
              <Plus size={18} />
              {draft.id ? "Editar FAQ" : "Nueva FAQ"}
            </h2>
            <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <label className="admin-form-label">
                Pregunta
                <input
                  type="text"
                  required
                  value={draft.question}
                  onChange={(e) => setDraft((p) => ({ ...p, question: e.target.value }))}
                  className="admin-input"
                  placeholder="Ej: ¿Cual es el costo de envio?"
                />
              </label>
              
              <label className="admin-form-label">
                Respuesta
                <textarea
                  required
                  value={draft.answer}
                  onChange={(e) => setDraft((p) => ({ ...p, answer: e.target.value }))}
                  className="admin-input"
                  placeholder="Escribe la respuesta aqui..."
                  rows={4}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <label className="admin-form-label">
                  Orden
                  <input
                    type="number"
                    min="1"
                    value={draft.sort_order}
                    onChange={(e) => setDraft((p) => ({ ...p, sort_order: e.target.value }))}
                    className="admin-input"
                  />
                </label>

                <label className="admin-form-label" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", marginTop: "24px" }}>
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => setDraft((p) => ({ ...p, is_active: e.target.checked }))}
                  />
                  Publicar activa
                </label>
              </div>
            </div>

            <div className="admin-card-actions" style={{ marginTop: 24 }}>
              {draft.id && (
                <button
                  type="button"
                  className="admin-button-secondary"
                  onClick={() => setDraft({ id: null, question: "", answer: "", is_active: true, sort_order: faqs.length + 1 })}
                >
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar FAQ"}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}

export default AdminFaqPage;

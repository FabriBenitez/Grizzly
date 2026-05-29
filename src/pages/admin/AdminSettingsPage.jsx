import { useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";
import { fetchStoreSettings, saveStoreSetting } from "../../utils/settings.remote";
import { useAuthSupabase } from "../../shared/auth/AuthSupabaseProvider";

function AdminSettingsPage() {
  const { puedeIniciarSesion, esAdmin } = useAuthSupabase();
  const [settings, setSettings] = useState({
    whatsapp_number: "",
    shipping_cost: 0,
    free_shipping_threshold: 0,
    announcement_banner: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!puedeIniciarSesion || !esAdmin) return;
    
    fetchStoreSettings().then(data => {
      setSettings(prev => ({
        whatsapp_number: data.whatsapp_number || prev.whatsapp_number,
        shipping_cost: data.shipping_cost ?? prev.shipping_cost,
        free_shipping_threshold: data.free_shipping_threshold ?? prev.free_shipping_threshold,
        announcement_banner: data.announcement_banner || prev.announcement_banner,
      }));
    }).catch(err => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, [puedeIniciarSesion, esAdmin]);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await Promise.all([
        saveStoreSetting("whatsapp_number", settings.whatsapp_number, "Numero de WhatsApp para pedidos"),
        saveStoreSetting("shipping_cost", Number(settings.shipping_cost), "Costo de envio estandar"),
        saveStoreSetting("free_shipping_threshold", Number(settings.free_shipping_threshold), "Monto minimo para envio gratis"),
        saveStoreSetting("announcement_banner", settings.announcement_banner, "Texto del banner superior de anuncios"),
      ]);
      setMessage("Configuraciones guardadas correctamente.");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-container">
      <header className="admin-page-header">
        <div className="admin-page-header-meta">
          <Settings size={24} strokeWidth={1.5} />
          <span>Sistema</span>
        </div>
        <p>Configuraciones</p>
        <h1>Ajustes Generales</h1>
        <span>Administra las variables globales que impactan en toda la tienda.</span>
      </header>

      {loading && <section className="admin-demo-note">Cargando configuraciones...</section>}
      {!loading && error && <section className="admin-demo-note">{error}</section>}
      {message && <section className="admin-demo-note">{message}</section>}

      {!loading && !error && (
        <form onSubmit={handleSubmit} className="admin-card" style={{ maxWidth: 800 }}>
          <h2 className="admin-card-title">Variables de la Tienda</h2>
          
          <div className="admin-form-grid">
            <label className="admin-form-label">
              Numero de WhatsApp
              <input
                type="text"
                className="admin-input"
                placeholder="Ej: 5491123456789"
                value={settings.whatsapp_number}
                onChange={(e) => handleChange("whatsapp_number", e.target.value)}
              />
            </label>

            <label className="admin-form-label">
              Costo de envio Estandar ($)
              <input
                type="number"
                className="admin-input"
                min="0"
                value={settings.shipping_cost}
                onChange={(e) => handleChange("shipping_cost", e.target.value)}
              />
            </label>

            <label className="admin-form-label">
              Envio Gratis a partir de ($)
              <input
                type="number"
                className="admin-input"
                min="0"
                value={settings.free_shipping_threshold}
                onChange={(e) => handleChange("free_shipping_threshold", e.target.value)}
              />
            </label>

            <label className="admin-form-label" style={{ gridColumn: "1 / -1" }}>
              Banner de Anuncios (Header superior)
              <input
                type="text"
                className="admin-input"
                placeholder="Ej: Envio gratis superando los $50.000"
                value={settings.announcement_banner}
                onChange={(e) => handleChange("announcement_banner", e.target.value)}
              />
            </label>
          </div>

          <div className="admin-card-actions" style={{ marginTop: 32 }}>
            <button type="submit" disabled={saving}>
              <Save size={18} />
              {saving ? "Guardando..." : "Guardar configuraciones"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AdminSettingsPage;

import { useState, type FormEvent } from "react";
import { KeyRound, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthSupabase } from "../../shared/auth/AuthSupabaseProvider";

interface AdminLoginScreenProps {
  mode?: "login" | "loading" | "unauthorized";
}

function AdminLoginScreen({ mode = "login" }: AdminLoginScreenProps) {
  const { cerrarSesion, iniciarSesion, puedeIniciarSesion } = useAuthSupabase();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);

    const result = await iniciarSesion(form);

    if (!result.ok) {
      setMessage(result.message ?? "No pudimos iniciar sesion.");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  };

  if (mode === "loading") {
    return (
      <section className="admin-auth-shell">
        <article className="admin-auth-card">
          <span className="admin-auth-icon">
            <LoaderCircle size={24} className="spin" />
          </span>
          <p className="admin-auth-kicker">Panel administrativo</p>
          <h1>Verificando acceso</h1>
          <p className="admin-auth-copy">
            Estamos validando la sesion del administrador para abrir el panel.
          </p>
        </article>
      </section>
    );
  }

  if (mode === "unauthorized") {
    return (
      <section className="admin-auth-shell">
        <article className="admin-auth-card">
          <span className="admin-auth-icon">
            <ShieldCheck size={24} />
          </span>
          <p className="admin-auth-kicker">Acceso restringido</p>
          <h1>Este usuario no tiene permisos de administrador</h1>
          <p className="admin-auth-copy">
            Ingresaste con una cuenta valida, pero no tiene el rol `admin` en Supabase.
          </p>
          <div className="admin-auth-actions">
            <button type="button" className="btn-primary" onClick={() => void cerrarSesion()}>
              <LogOut size={18} />
              Cerrar sesion
            </button>
            <Link to="/" className="btn-outline">
              Volver a la tienda
            </Link>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="admin-auth-shell">
      <article className="admin-auth-card">
        <span className="admin-auth-icon">
          <KeyRound size={24} />
        </span>
        <p className="admin-auth-kicker">Acceso admin</p>
        <h1>Inicia sesion para entrar al panel</h1>
        <p className="admin-auth-copy">
          Este acceso es exclusivo para los duenios. El usuario administrador se crea
          directamente en Supabase, sin registro publico en la web.
        </p>

        <form className="admin-auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Email administrador
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="admin@grizzly.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Contrasena
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Ingresar contrasena"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="submit"
            className="btn-primary full"
            disabled={submitting || !puedeIniciarSesion}
          >
            {submitting ? "Ingresando..." : "Entrar al panel"}
          </button>
        </form>

        {!puedeIniciarSesion ? (
          <p className="feedback-error">
            Falta configurar `VITE_SUPABASE_URL` y la clave publica de Supabase en `.env.local`.
          </p>
        ) : null}

        {message ? <p className="feedback-error">{message}</p> : null}

        <div className="admin-auth-actions">
          <Link to="/" className="btn-outline">
            Volver a la tienda
          </Link>
        </div>
      </article>
    </section>
  );
}

export default AdminLoginScreen;

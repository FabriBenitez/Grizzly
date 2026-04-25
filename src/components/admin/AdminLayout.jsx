import { Menu, Store, X } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useMemo, useState } from "react";
import "../../admin.css";

const adminNav = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/pedidos", label: "Pedidos" },
  { to: "/admin/pagos", label: "Pagos" },
  { to: "/admin/productos", label: "Productos" },
  { to: "/admin/promociones", label: "Promociones" },
  { to: "/admin/hero", label: "Hero" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/stock", label: "Stock" },
  { to: "/admin/caja", label: "Caja" },
  { to: "/admin/reportes", label: "Reportes" },
];

function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date()),
    [],
  );

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <img src="/assets/logo-grizzly.jpg" alt="Grizzly" />
          <div>
            <strong>Admin Grizzly</strong>
            <small>Panel comercial</small>
          </div>
        </div>

        <nav className="admin-nav">
          {adminNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/" className="back-store">
            <Store size={16} />
            Ir a tienda cliente
          </NavLink>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Abrir menu admin"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <p>Panel administrativo separado del frontend cliente</p>
            <strong>{today}</strong>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

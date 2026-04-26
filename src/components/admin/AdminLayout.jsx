import {
  BarChart3,
  Boxes,
  Image,
  LayoutDashboard,
  Menu,
  PackageCheck,
  Percent,
  Receipt,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useMemo, useState } from "react";
import "../../admin.css";

const adminNav = [
  { to: "/admin", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/admin/pedidos", label: "Pedidos", icon: PackageCheck },
  { to: "/admin/pagos", label: "Pagos", icon: Wallet },
  { to: "/admin/productos", label: "Productos", icon: Boxes },
  { to: "/admin/promociones", label: "Promociones", icon: Percent },
  { to: "/admin/hero", label: "Hero", icon: Image },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/stock", label: "Stock", icon: Boxes },
  { to: "/admin/caja", label: "Caja", icon: Receipt },
  { to: "/admin/reportes", label: "Reportes", icon: BarChart3 },
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
            <small>Panel comercial para ecommerce y local</small>
          </div>
        </div>

        <nav className="admin-nav">
          {adminNav.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/" className="back-store">
            <Store size={16} />
            Ir a tienda cliente
          </NavLink>
        </div>
      </aside>

      {menuOpen ? <button type="button" className="admin-sidebar-overlay" onClick={() => setMenuOpen(false)} aria-label="Cerrar menu lateral" /> : null}

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
          <div className="admin-topbar-copy">
            <span>Panel administrativo</span>
            <p>Operacion comercial unificada para ventas, pedidos, stock y reportes.</p>
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

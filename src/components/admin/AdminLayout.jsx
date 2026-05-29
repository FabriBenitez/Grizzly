import {
  BarChart3,
  Boxes,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Percent,
  Receipt,
  Settings,
  HelpCircle,
  Store,
  Users,
  Wallet,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuthSupabase } from "../../shared/auth/AuthSupabaseProvider";
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
  { to: "/admin/faq", label: "FAQs", icon: HelpCircle },
  { to: "/admin/configuracion", label: "Sistema", icon: Settings },
];

function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { cerrarSesion, perfil, usuario } = useAuthSupabase();

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date()),
    [],
  );

  return (
    <div className={`admin-shell ${isCollapsed ? "collapsed-sidebar" : ""}`}>
      <aside className={`admin-sidebar ${menuOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        <div className="admin-brand">
          <img src="/assets/logo-grizzly.jpg" alt="Grizzly" />
          {!isCollapsed && (
            <div>
              <strong>Admin Grizzly</strong>
              <small>Panel comercial</small>
            </div>
          )}
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
                title={isCollapsed ? item.label : undefined}
                className={isCollapsed ? "icon-only" : ""}
              >
                <Icon size={isCollapsed ? 22 : 18} />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          {!isCollapsed && (
            <div className="admin-sidebar-session">
              <strong>{perfil?.full_name || "Administrador"}</strong>
              <small>{usuario?.email || "Sesion iniciada"}</small>
            </div>
          )}
          <button
            type="button"
            className={`admin-logout-btn ${isCollapsed ? "icon-only" : ""}`}
            onClick={() => void cerrarSesion()}
            title={isCollapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && "Cerrar sesión"}
          </button>
          <NavLink 
            to="/" 
            className={`back-store ${isCollapsed ? "icon-only" : ""}`}
            title={isCollapsed ? "Ir a tienda" : undefined}
          >
            <Store size={18} />
            {!isCollapsed && <span>Ir a tienda</span>}
          </NavLink>
        </div>
      </aside>

      {menuOpen ? <button type="button" className="admin-sidebar-overlay" onClick={() => setMenuOpen(false)} aria-label="Cerrar menu lateral" /> : null}

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-actions">
            {/* Mobile menu toggle */}
            <button
              type="button"
              className="admin-menu-btn mobile-only"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Abrir menu admin"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            {/* Desktop collapse toggle */}
            <button
              type="button"
              className="admin-menu-btn desktop-only"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>

            <div className="admin-topbar-copy">
              <span>¡Hola, {perfil?.full_name?.split(" ")[0] || "Admin"}! 👋</span>
              <strong>{today}</strong>
            </div>
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

import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { categories } from "../../data/products";

const navigation = [
  { to: "/", label: "Inicio" },
  { to: "/promos", label: "Promos" },
  { to: "/catalogo", label: "Productos" },
  { to: "/quienes-somos", label: "Quiénes somos" },
  { to: "/seguimiento", label: "Seguí tu pedido" },
];

function Header() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMega, setShowMega] = useState(false);
  const { summary } = useCart();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const categoryColumns = useMemo(() => {
    const perColumn = Math.ceil(categories.length / 3);
    return [
      categories.slice(0, perColumn),
      categories.slice(perColumn, perColumn * 2),
      categories.slice(perColumn * 2),
    ].filter(Boolean);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/catalogo?q=${encodeURIComponent(query)}`);
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="header-top container">
        <Link to="/" className="brand-logo">
          <img src="/assets/logo-grizzly.jpg" alt="Logo Grizzly Suplementos" />
          <span>
            Grizzly
            <small>SUPLEMENTOS</small>
          </span>
        </Link>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="¿Qué estás buscando?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" aria-label="Buscar">
            <Search size={20} />
          </button>
        </form>

        <div className="header-actions">
          <Link to="/cuenta" className="account-link">
            <User size={18} />
            <span>
              {currentUser ? `Hola, ${currentUser.name.split(" ")[0]}` : "¡Hola! Iniciá sesión"}
              <small>{currentUser ? "Ver mi cuenta" : "O podés registrarte"}</small>
            </span>
          </Link>
          <Link to="/checkout" className="cart-link" aria-label="Ver carrito">
            <ShoppingBag size={22} />
            {summary.count > 0 && <b>{summary.count}</b>}
          </Link>
          <button className="menu-toggle" onClick={() => setMenuOpen((prev) => !prev)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className={`header-nav-wrap ${menuOpen ? "open" : ""}`}>
        <nav className="header-nav container">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/admin" onClick={() => setMenuOpen(false)}>
            Admin
          </NavLink>
        </nav>
      </div>

      <div
        className="mega-trigger container"
        onMouseEnter={() => setShowMega(true)}
        onMouseLeave={() => setShowMega(false)}
      >
        <button type="button" className="mega-button">
          Categorías de productos
        </button>
        {showMega && (
          <div className="mega-menu">
            {categoryColumns.map((column, index) => (
              <ul key={`col-${index}`}>
                {column.map((category) => (
                  <li key={category}>
                    <Link
                      to={`/catalogo?categoria=${encodeURIComponent(category)}`}
                      onClick={() => setShowMega(false)}
                    >
                      {category}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;

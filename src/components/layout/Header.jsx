import { useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useCatalogProducts } from "../../hooks/useCatalogProducts";
import { getCatalogCategories } from "../../utils/catalogStore";

const navigation = [
  { to: "/", label: "Inicio" },
  { to: "/promos", label: "Promos" },
  { to: "/catalogo", label: "Productos" },
  { to: "/quienes-somos", label: "Quienes somos" },
];

const promoMessages = [
  "Envio gratis a partir de $120.000 en tu compra",
  "Envio gratis a partir de $120.000 en tu compra",
  "Envio gratis a partir de $120.000 en tu compra",

];

function Header() {
  const products = useCatalogProducts();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMega, setShowMega] = useState(false);
  const { summary } = useCart();
  const navigate = useNavigate();
  const categories = useMemo(() => getCatalogCategories(products), [products]);

  const categoryColumns = useMemo(() => {
    const perColumn = Math.ceil(categories.length / 3);
    return [
      categories.slice(0, perColumn),
      categories.slice(perColumn, perColumn * 2),
      categories.slice(perColumn * 2),
    ].filter((column) => column.length > 0);
  }, [categories]);

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/catalogo?q=${encodeURIComponent(query)}`);
    setMenuOpen(false);
    setShowMega(false);
  };

  const closeMenus = () => {
    setMenuOpen(false);
    setShowMega(false);
  };

  return (
    <header className="site-header">
      <div className="promo-strip" aria-label="Promociones destacadas">
        <div className="promo-strip-track">
          {[0, 1, 2, 3].map((group) => (
            <div key={group} className="promo-strip-group" aria-hidden={group > 0}>
              {promoMessages.map((message, index) => (
                <span key={`${group}-${index}`}>{message}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

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
            placeholder="Que estas buscando?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" aria-label="Buscar">
            <Search size={20} />
          </button>
        </form>

        <div className="header-actions">
          <Link to="/admin" className="account-link" aria-label="Abrir panel de admin">
            <span>
              Admin
            </span>
          </Link>

          <Link to="/checkout" className="cart-link" aria-label="Ver carrito">
            <ShoppingBag size={22} />
            {summary.count > 0 && <b>{summary.count}</b>}
          </Link>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div className={`header-nav-wrap ${menuOpen ? "open" : ""}`}>
        <nav className="header-nav container">
          {navigation.map((item) =>
            item.to === "/catalogo" ? (
              <div
                key={item.to}
                className="nav-item-with-mega"
                onMouseEnter={() => setShowMega(true)}
                onMouseLeave={() => setShowMega(false)}
              >
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={closeMenus}
                >
                  {item.label}
                </NavLink>

                {showMega && (
                  <div className="mega-menu">
                    {categoryColumns.map((column, index) => (
                      <ul key={`col-${index}`}>
                        {column.map((category) => (
                          <li key={category}>
                            <Link
                              to={`/catalogo?categoria=${encodeURIComponent(category)}`}
                              onClick={closeMenus}
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
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={closeMenus}
              >
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;

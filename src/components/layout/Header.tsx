import { useMemo, useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useCatalogProducts } from "../../hooks/useCatalogProducts";
import { getCatalogCategories } from "../../utils/catalogStore";
import estilos from "./Header.module.scss";

const navegacionPrincipal = [
  { to: "/", label: "Inicio" },
  { to: "/promos", label: "Promos" },
  { to: "/catalogo", label: "Productos" },
  { to: "/quienes-somos", label: "Quiénes somos" },
];

const mensajesPromocionales = [
  "Envío gratis a partir de $120.000 en tu compra",
  "Combos destacados con precio especial por transferencia",
  "Atención personalizada para elegir tu suplementación",
];

function Header() {
  const productos = useCatalogProducts();
  const [consulta, setConsulta] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mostrarMegaMenu, setMostrarMegaMenu] = useState(false);
  const { summary } = useCart();
  const navigate = useNavigate();

  const categorias = useMemo(() => getCatalogCategories(productos) as string[], [productos]);

  const columnasCategorias = useMemo(() => {
    const itemsPorColumna = Math.ceil(categorias.length / 3);

    return [
      categorias.slice(0, itemsPorColumna),
      categorias.slice(itemsPorColumna, itemsPorColumna * 2),
      categorias.slice(itemsPorColumna * 2),
    ].filter((columna) => columna.length > 0);
  }, [categorias]);

  const manejarBusqueda = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/catalogo?q=${encodeURIComponent(consulta)}`);
    setMenuAbierto(false);
    setMostrarMegaMenu(false);
  };

  const cerrarMenus = () => {
    setMenuAbierto(false);
    setMostrarMegaMenu(false);
  };

  return (
    <header className={estilos.encabezado}>
      <a href="#contenido-principal" className={estilos["encabezado__salto"]}>
        Saltar al contenido principal
      </a>

      <div className={estilos["encabezado__franja"]} aria-label="Promociones destacadas">
        <div className={estilos["encabezado__franja-pista"]}>
          {[0, 1, 2, 3].map((grupo) => (
            <div
              key={grupo}
              className={estilos["encabezado__franja-grupo"]}
              aria-hidden={grupo > 0}
            >
              {mensajesPromocionales.map((mensaje, indice) => (
                <span key={`${grupo}-${indice}`} className={estilos["encabezado__franja-texto"]}>
                  {mensaje}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={`container ${estilos["encabezado__superior"]}`}>
        <Link to="/" className={estilos["encabezado__marca"]} aria-label="Ir al inicio de Grizzly Suplementos">
          <img
            src="/assets/logo-grizzly.jpg"
            alt="Logo de Grizzly Suplementos"
            className={estilos["encabezado__marca-imagen"]}
          />
          <span className={estilos["encabezado__marca-texto"]}>
            Grizzly
            <small className={estilos["encabezado__marca-subtexto"]}>SUPLEMENTOS</small>
          </span>
        </Link>

        <form className={estilos["encabezado__buscador"]} onSubmit={manejarBusqueda}>
          <label htmlFor="busqueda-catalogo" className="oculto-visualmente">
            Buscar productos del catálogo
          </label>
          <input
            id="busqueda-catalogo"
            type="search"
            placeholder="¿Qué estás buscando?"
            value={consulta}
            onChange={(event) => setConsulta(event.target.value)}
            className={estilos["encabezado__buscador-input"]}
          />
          <button
            type="submit"
            aria-label="Buscar productos"
            className={estilos["encabezado__buscador-boton"]}
          >
            <Search size={20} />
          </button>
        </form>

        <div className={estilos["encabezado__acciones"]}>
          <Link
            to="/admin"
            className={estilos["encabezado__acceso-admin"]}
            aria-label="Abrir panel de administración"
          >
            <span>Admin</span>
          </Link>

          <Link to="/checkout" className={estilos["encabezado__carrito"]} aria-label="Ver carrito">
            <ShoppingBag size={22} />
            {summary.count > 0 ? (
              <b className={estilos["encabezado__carrito-cantidad"]}>{summary.count}</b>
            ) : null}
          </Link>

          <button
            type="button"
            className={estilos["encabezado__menu-boton"]}
            onClick={() => setMenuAbierto((previo) => !previo)}
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          >
            {menuAbierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <div
        className={`${estilos["encabezado__nav-contenedor"]} ${menuAbierto ? estilos["encabezado__nav-contenedor--abierto"] : ""}`}
      >
        <nav className={`container ${estilos["encabezado__nav"]}`} aria-label="Navegación principal">
          {navegacionPrincipal.map((item) =>
            item.to === "/catalogo" ? (
              <div
                key={item.to}
                className={estilos["encabezado__item-con-mega"]}
                onMouseEnter={() => setMostrarMegaMenu(true)}
                onMouseLeave={() => setMostrarMegaMenu(false)}
              >
                <NavLink
                  to={item.to}
                  end={false}
                  onClick={cerrarMenus}
                  className={({ isActive }) =>
                    `${estilos["encabezado__enlace"]} ${isActive ? estilos["encabezado__enlace--activo"] : ""}`
                  }
                >
                  {item.label}
                </NavLink>

                {mostrarMegaMenu ? (
                  <div className={estilos["encabezado__mega"]}>
                    {columnasCategorias.map((columna, indice) => (
                      <ul key={`col-${indice}`} className={estilos["encabezado__mega-lista"]}>
                        {columna.map((categoria) => (
                          <li key={categoria}>
                            <Link
                              to={`/catalogo?categoria=${encodeURIComponent(categoria)}`}
                              onClick={cerrarMenus}
                            >
                              {categoria}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={cerrarMenus}
                className={({ isActive }) =>
                  `${estilos["encabezado__enlace"]} ${isActive ? estilos["encabezado__enlace--activo"] : ""}`
                }
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

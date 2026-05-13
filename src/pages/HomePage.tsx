import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ui/ProductCard";
import SectionTitle from "../components/ui/SectionTitle";
import { useCatalogProducts } from "../hooks/useCatalogProducts";
import {
  getComboProducts,
  getMostSoldProducts,
  getPromoProducts,
} from "../shared/catalog/productDiscovery";
import { getActiveHeroSlides } from "../utils/heroSlides";
import SeoPagina from "../shared/seo/SeoPagina";
import type { DiapositivaHero } from "../tipos/hero";
import estilos from "./HomePage.module.scss";

const categoriasDestacadas = [
  "Combos",
  "Creatina",
  "Proteina",
  "Magnesios y Omega 3",
  "Colagenos",
  "Vitaminas",
  "Pre entreno",
  "Ganadores de peso",
  "Accesorios",
  "Alimentos fit y Pancakes",
];

function HomePage() {
  const productos = useCatalogProducts();
  const [indiceActivo, setIndiceActivo] = useState(0);
  const [diapositivasHero] = useState<DiapositivaHero[]>(() => getActiveHeroSlides() as DiapositivaHero[]);

  const promociones = useMemo(() => getPromoProducts(productos, 6), [productos]);
  const combos = useMemo(() => getComboProducts(productos, 6), [productos]);
  const masVendidos = useMemo(() => getMostSoldProducts(productos, 6), [productos]);

  useEffect(() => {
    if (diapositivasHero.length <= 1) {
      return undefined;
    }

    const intervaloId = window.setInterval(() => {
      setIndiceActivo((actual) => (actual + 1) % diapositivasHero.length);
    }, 5000);

    return () => window.clearInterval(intervaloId);
  }, [diapositivasHero]);

  const diapositivaActual = diapositivasHero[indiceActivo] || diapositivasHero[0];
  const mostrarOverlayHero = diapositivaActual?.showOverlay !== false;

  const mostrarPromoAnterior = () => {
    setIndiceActivo((actual) => (actual - 1 + diapositivasHero.length) % diapositivasHero.length);
  };

  const mostrarPromoSiguiente = () => {
    setIndiceActivo((actual) => (actual + 1) % diapositivasHero.length);
  };

  return (
    <div className={estilos.inicio}>
      <SeoPagina
        titulo="Grizzly Suplementos | Creatinas, proteínas y combos"
        descripcion="Comprá suplementos en Grizzly: creatinas, proteínas, combos y promos destacadas con seguimiento de pedido y atención personalizada."
      />

      <section
        className={`hero-carousel-section ${estilos["inicio__hero"]}`}
        aria-label="Carrusel principal de promociones"
      >
        <article className="hero-carousel-slide">
          <div className="hero-carousel-stage" aria-hidden="true">
            {diapositivasHero.map((slide, index) => (
              <div
                key={slide.id}
                className={`hero-carousel-bg ${index === indiceActivo ? "active" : ""} ${slide.showOverlay === false ? "image-only" : ""}`}
                style={{ "--hero-image": `url("${slide.image}")` } as CSSProperties}
              />
            ))}
          </div>

          <div className="hero-carousel-ambient" aria-hidden="true">
            <span className="hero-orb hero-orb-one" />
            <span className="hero-orb hero-orb-two" />
            <span className="hero-orb hero-orb-three" />
            <span className="hero-sheen-line" />
          </div>

          <button
            type="button"
            className="hero-carousel-arrow left"
            onClick={mostrarPromoAnterior}
            aria-label="Mostrar promoción anterior"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            type="button"
            className="hero-carousel-arrow right"
            onClick={mostrarPromoSiguiente}
            aria-label="Mostrar siguiente promoción"
          >
            <ChevronRight size={24} />
          </button>

          <div className={`container hero-carousel-content ${mostrarOverlayHero ? "" : "image-only"}`}>
            {mostrarOverlayHero ? (
              <header key={diapositivaActual.id} className="hero-carousel-copy hero-carousel-copy-enter">
                <p className="hero-carousel-kicker">{diapositivaActual.kicker}</p>
                <h1>
                  <span>{diapositivaActual.titleLead}</span>
                  <strong>{diapositivaActual.titleHighlight}</strong>
                  <em>{diapositivaActual.titleTail}</em>
                </h1>
                <p className="hero-carousel-description">{diapositivaActual.description}</p>

                <div className="hero-carousel-badges">
                  {diapositivaActual.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>

                <div className={estilos["inicio__hero-acciones"]}>
                  <Link to="/catalogo" className="btn-primary">
                    Ver productos
                  </Link>
                  <Link to="/promos" className="btn-outline hero-outline-light">
                    Ver promos
                  </Link>
                </div>
              </header>
            ) : null}

            <div
              key={`${diapositivaActual.id}-bottom`}
              className={`hero-carousel-bottom hero-carousel-bottom-enter ${mostrarOverlayHero ? "" : "solo-dots"}`}
            >
              {mostrarOverlayHero && diapositivaActual.stats.length > 0 ? (
                <div className="hero-carousel-stats">
                  {diapositivaActual.stats.map((stat) => (
                    <span key={stat}>{stat}</span>
                  ))}
                </div>
              ) : null}

              <div className="hero-carousel-dots" aria-label="Seleccionar promoción">
                {diapositivasHero.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`hero-carousel-dot ${index === indiceActivo ? "active" : ""}`}
                    onClick={() => setIndiceActivo(index)}
                    aria-label={`Ver promoción ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="container section-space" aria-labelledby="promociones-destacadas">
        <SectionTitle
          id="promociones-destacadas"
          eyebrow="Marzo activo"
          title="Promos de marzo"
          subtitle="Precios especiales por transferencia y combos limitados."
        />
        <div className="product-grid six-col">
          {promociones.map((producto, index) => (
            <ProductCard key={producto.id} product={producto} compact revealIndex={index} />
          ))}
        </div>
      </section>

      <section className={`container section-space ${estilos["inicio__seccion-categorias"]}`} aria-labelledby="categorias-destacadas">
        <SectionTitle
          id="categorias-destacadas"
          eyebrow="Explorá por objetivo"
          title="Categorías destacadas"
          subtitle="Entrá directo a las líneas más buscadas del catálogo."
        />
        <div className={estilos["inicio__categorias-grid"]}>
          {categoriasDestacadas.map((categoria) => {
            const productoRelacionado = productos.find((producto) => producto.category === categoria);

            return (
              <Link
                to={`/catalogo?categoria=${encodeURIComponent(categoria)}`}
                key={categoria}
                className={estilos["inicio__categoria-card"]}
              >
                <img
                  src={productoRelacionado?.image || "/assets/products/combo-estrella.jpg"}
                  alt={`Explorar categoría ${categoria}`}
                  className={estilos["inicio__categoria-imagen"]}
                />
                <span className={estilos["inicio__categoria-titulo"]}>{categoria}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="combo-section" aria-labelledby="combos-destacados">
        <div className="container section-space">
          <SectionTitle
            id="combos-destacados"
            eyebrow="Aprovechá packs"
            title="Combos destacados"
            subtitle="Kits armados para fuerza, energía y recuperación."
            light
          />
          <div className="product-grid six-col">
            {combos.map((producto, index) => (
              <ProductCard key={producto.id} product={producto} compact revealIndex={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="container section-space" aria-labelledby="mas-elegidos">
        <SectionTitle
          id="mas-elegidos"
          eyebrow="Top ventas"
          title="Los más elegidos"
          subtitle="Productos con mejor rendimiento según la comunidad."
        />
        <div className="product-grid six-col">
          {masVendidos.map((producto, index) => (
            <ProductCard key={producto.id} product={producto} compact revealIndex={index} />
          ))}
        </div>
      </section>

      <section className={`container section-space ${estilos["inicio__beneficios"]}`} aria-labelledby="beneficios-grizzly">
        <h2 id="beneficios-grizzly" className="oculto-visualmente">
          Beneficios de comprar en Grizzly Suplementos
        </h2>

        <article className={estilos["inicio__beneficio"]}>
          <h3>Pedido rápido por WhatsApp</h3>
          <p>Armá tu carrito, completá datos y enviá la orden lista al vendedor.</p>
        </article>

        <article className={estilos["inicio__beneficio"]}>
          <h3>Seguimiento de pedido</h3>
          <p>Controlá estado: pendiente, pago confirmado, preparación, envío o retiro.</p>
        </article>

        <article className={estilos["inicio__beneficio"]}>
          <h3>Atención personalizada</h3>
          <p>Te asesoramos para elegir suplementos según tu objetivo deportivo.</p>
        </article>
      </section>
    </div>
  );
}

export default HomePage;

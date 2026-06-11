import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ui/ProductCard";
import ProductCarousel from "../components/ui/ProductCarousel";
import SectionTitle from "../components/ui/SectionTitle";
import { useCatalogProducts } from "../hooks/useCatalogProducts";
import {
  getComboProducts,
  getHighlightedProducts,
  getMostSoldProducts,
  getPromoProducts,
} from "../shared/catalog/productDiscovery";
import { fetchHeroSlidesFromSupabase } from "../utils/hero.remote";
import { getActiveDefaultHeroSlides } from "../utils/heroSlides";
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
  const [diapositivasHero, setDiapositivasHero] = useState<DiapositivaHero[]>(
    () => getActiveDefaultHeroSlides() as DiapositivaHero[],
  );

  const promociones = useMemo(() => getPromoProducts(productos, 10), [productos]);
  const combos = useMemo(() => getComboProducts(productos, 10), [productos]);
  const destacados = useMemo(() => getHighlightedProducts(productos, 10), [productos]);
  const masVendidos = useMemo(() => getMostSoldProducts(productos, 10), [productos]);

  const tendencias = useMemo(() => {
    const combined = [...destacados, ...masVendidos];
    const unique = combined.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
    return unique.slice(0, 12);
  }, [destacados, masVendidos]);

  const ofertasYCombos = useMemo(() => {
    const combined = [...promociones, ...combos];
    const unique = combined.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
    return unique.slice(0, 12);
  }, [promociones, combos]);

  useEffect(() => {
    let activo = true;

    const cargarHeroReal = async () => {
      try {
        const remoteSlides = (await fetchHeroSlidesFromSupabase()) as DiapositivaHero[];
        if (activo && remoteSlides.length) {
          setDiapositivasHero(remoteSlides);
        }
      } catch (error) {
        console.error("Error al cargar los banners promocionales desde Supabase:", error);
        // Si falla la carga remota, mantenemos el fallback visual local.
      }
    };

    cargarHeroReal();

    return () => {
      activo = false;
    };
  }, []);

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
  const usaTituloUnificado = Boolean(diapositivaActual?.title?.trim());

  const mostrarPromoAnterior = () => {
    setIndiceActivo((actual) => (actual - 1 + diapositivasHero.length) % diapositivasHero.length);
  };

  const mostrarPromoSiguiente = () => {
    setIndiceActivo((actual) => (actual + 1) % diapositivasHero.length);
  };

  return (
    <div className={estilos.inicio}>
      <SeoPagina
        titulo="Grizzly Suplementos | Creatinas, proteinas y combos"
        descripcion="Compra suplementos en Grizzly: creatinas, proteinas, combos y promos destacadas con seguimiento de pedido y atencion personalizada."
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
            aria-label="Mostrar promocion anterior"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            type="button"
            className="hero-carousel-arrow right"
            onClick={mostrarPromoSiguiente}
            aria-label="Mostrar siguiente promocion"
          >
            <ChevronRight size={24} />
          </button>

        </article>
      </section>

      <section
        className={`container section-space ${estilos["inicio__seccion-categorias"]}`}
        aria-labelledby="categorias-destacadas"
      >
        <SectionTitle
          id="categorias-destacadas"
          eyebrow="Explora por objetivo"
          title="Categorias destacadas"
          subtitle="Entra directo a las lineas mas buscadas del catalogo."
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
                <div className={estilos["inicio__categoria-imagen-container"]}>
                  <img
                    src={productoRelacionado?.image || "/assets/products/combo-estrella.jpg"}
                    alt={`Explorar categoria ${categoria}`}
                    className={estilos["inicio__categoria-imagen"]}
                  />
                </div>
                <div className={estilos["inicio__categoria-caja-verde"]}>
                  <span className={estilos["inicio__categoria-titulo"]}>{categoria}</span>
                </div>
                <span className={estilos["inicio__categoria-subtitulo"]}>{categoria}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {ofertasYCombos.length > 0 && (
        <section className="container section-space" aria-labelledby="promociones-destacadas">
          <SectionTitle
            id="promociones-destacadas"
            eyebrow="Marzo activo"
            title="Ofertas y Combos"
            subtitle="Packs utiles y descuentos reales para tu entrenamiento."
          />
          <ProductCarousel autoPlayInterval={5000}>
            {ofertasYCombos.map((producto, index) => (
              <ProductCard key={producto.id} product={producto} compact revealIndex={index} />
            ))}
          </ProductCarousel>
        </section>
      )}

      {tendencias.length > 0 && (
        <section className="combo-section" aria-labelledby="tendencias-grizzly">
          <div className="container section-space">
            <SectionTitle
              id="tendencias-grizzly"
              eyebrow="Curaduria Grizzly"
              title="Tendencias y Favoritos"
              subtitle="Los mas elegidos por la comunidad y selecciones destacadas."
              light
            />
            <ProductCarousel autoPlayInterval={6000}>
              {tendencias.map((producto, index) => (
                <ProductCard key={producto.id} product={producto} compact revealIndex={index} />
              ))}
            </ProductCarousel>
          </div>
        </section>
      )}

      <section
        className={`container section-space ${estilos["inicio__beneficios"]}`}
        aria-labelledby="beneficios-grizzly"
      >
        <h2 id="beneficios-grizzly" className="oculto-visualmente">
          Beneficios de comprar en Grizzly Suplementos
        </h2>

        <article className={estilos["inicio__beneficio"]}>
          <h3>Checkout online seguro</h3>
          <p>Arma tu carrito, confirma tus datos y paga desde el checkout sin depender de un chat.</p>
        </article>

        <article className={estilos["inicio__beneficio"]}>
          <h3>Seguimiento de pedido</h3>
          <p>Controla estado: pendiente, pago confirmado, preparacion, envio o retiro.</p>
        </article>

        <article className={estilos["inicio__beneficio"]}>
          <h3>Seleccion comercial editable</h3>
          <p>Los productos destacados de la home se administran desde el panel para mover el catalogo.</p>
        </article>

        <article className={estilos["inicio__beneficio"]}>
          <h3>Soporte por WhatsApp</h3>
          <p>Te acompanamos con consultas de productos, cambios de datos y seguimiento del pedido.</p>
        </article>
      </section>
    </div>
  );
}

export default HomePage;

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ui/ProductCard";
import SectionTitle from "../components/ui/SectionTitle";
import { products } from "../data/products";
import { getActiveHeroSlides } from "../utils/heroSlides";

function HomePage() {
  const [activePromo, setActivePromo] = useState(0);
  const [heroSlides] = useState(() => getActiveHeroSlides());
  const promos = products.filter((product) => product.promo).slice(0, 6);
  const combos = products.filter((product) => product.combo).slice(0, 6);
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold).slice(0, 6);

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActivePromo((current) => (current + 1) % heroSlides.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [heroSlides]);

  const categoryCards = [
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

  const currentSlide = heroSlides[activePromo] || heroSlides[0];

  const showPrevPromo = () => {
    setActivePromo((current) => (current - 1 + heroSlides.length) % heroSlides.length);
  };

  const showNextPromo = () => {
    setActivePromo((current) => (current + 1) % heroSlides.length);
  };

  return (
    <div className="home-page">
      <section className="hero-carousel-section" aria-label="Carrusel principal de promociones">
        <article
          className="hero-carousel-slide"
          style={{ "--hero-image": `url("${currentSlide.image}")` }}
        >
          <button
            type="button"
            className="hero-carousel-arrow left"
            onClick={showPrevPromo}
            aria-label="Slide anterior"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            type="button"
            className="hero-carousel-arrow right"
            onClick={showNextPromo}
            aria-label="Slide siguiente"
          >
            <ChevronRight size={24} />
          </button>

          <div className="container hero-carousel-content">
            <div className="hero-carousel-copy">
              <p className="hero-carousel-kicker">{currentSlide.kicker}</p>
              <h1>
                <span>{currentSlide.titleLead}</span>
                <strong>{currentSlide.titleHighlight}</strong>
                <em>{currentSlide.titleTail}</em>
              </h1>
              <p className="hero-carousel-description">{currentSlide.description}</p>

              <div className="hero-carousel-badges">
                {currentSlide.badges.map((badge) => (
                  <span key={badge}>{badge}</span>
                ))}
              </div>

              <div className="hero-actions">
                <Link to="/catalogo" className="btn-primary">
                  Ver productos
                </Link>
                <Link to="/promos" className="btn-outline hero-outline-light">
                  Ver promos
                </Link>
              </div>
            </div>

            <div className="hero-carousel-bottom">
              <div className="hero-carousel-stats">
                {currentSlide.stats.map((stat) => (
                  <span key={stat}>{stat}</span>
                ))}
              </div>

              <div className="hero-carousel-dots" aria-label="Seleccionar slide">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`hero-carousel-dot ${index === activePromo ? "active" : ""}`}
                    onClick={() => setActivePromo(index)}
                    aria-label={`Ver slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="container section-space">
        <SectionTitle
          eyebrow="Marzo activo"
          title="Promos de Marzo"
          subtitle="Precios especiales por transferencia y combos limitados."
        />
        <div className="product-grid six-col">
          {promos.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </section>

      <section className="container section-space">
        <div className="category-bubbles">
          {categoryCards.map((category) => {
            const matched = products.find((product) => product.category === category);
            return (
              <Link
                to={`/catalogo?categoria=${encodeURIComponent(category)}`}
                key={category}
                className="bubble-link"
              >
                <img src={matched?.image || "/assets/products/combo-estrella.jpg"} alt={category} />
                <span>{category}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="combo-section">
        <div className="container section-space">
          <SectionTitle
            eyebrow="Aprovecha packs"
            title="Combos destacados"
            subtitle="Kits armados para fuerza, energia y recuperacion."
            light
          />
          <div className="product-grid six-col">
            {combos.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="container section-space">
        <SectionTitle
          eyebrow="Top ventas"
          title="Los mas elegidos"
          subtitle="Productos con mejor rendimiento segun la comunidad."
        />
        <div className="product-grid six-col">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </section>

      <section className="container section-space feature-strip">
        <article>
          <h3>Pedido rapido por WhatsApp</h3>
          <p>Arma tu carrito, completa datos y envia la orden lista al vendedor.</p>
        </article>
        <article>
          <h3>Seguimiento de pedido</h3>
          <p>Controla estado: pendiente, pago confirmado, preparacion, envio o retiro.</p>
        </article>
        <article>
          <h3>Atencion personalizada</h3>
          <p>Te asesoramos para elegir suplementos segun tu objetivo deportivo.</p>
        </article>
      </section>
    </div>
  );
}

export default HomePage;

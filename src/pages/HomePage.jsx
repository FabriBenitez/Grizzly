import { Link } from "react-router-dom";
import ProductCard from "../components/ui/ProductCard";
import SectionTitle from "../components/ui/SectionTitle";
import { products } from "../data/products";

function HomePage() {
  const promos = products.filter((product) => product.promo).slice(0, 6);
  const combos = products.filter((product) => product.combo).slice(0, 6);
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold).slice(0, 6);
  const heroProducts = products.filter((product) => ["p1", "p4", "p12"].includes(product.id));

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

  return (
    <div className="home-page">
      <section className="hero-banner hero-solid">
        <div className="container hero-solid-grid">
          <div className="hero-copy">
            <p className="hero-kicker">Grizzly suplementos</p>
            <h1>Ofertas y productos para potenciar tu entrenamiento</h1>
            <p className="hero-subtitle">
              Compra por catalogo, agrega al carrito y finaliza pedido en WhatsApp en segundos.
            </p>
            <div className="hero-tags">
              <span>Ofertas activas</span>
              <span>Productos destacados</span>
              <span>Combos con descuento</span>
            </div>
            <div className="hero-actions">
              <Link to="/promos" className="btn-primary">
                Ver ofertas
              </Link>
              <Link to="/catalogo" className="btn-outline">
                Ver productos
              </Link>
            </div>
          </div>

          <div className="hero-product-stack">
            {heroProducts.map((product) => (
              <article key={product.id}>
                <img src={product.image} alt={product.name} />
                <div>
                  <small>{product.category}</small>
                  <strong>{product.name}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
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
            title="Combos con Descuento"
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

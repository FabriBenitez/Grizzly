function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container">
          <h1>Quienes Somos</h1>
          <h2>Somos Grizzly: mas que suplementos, una comunidad</h2>
          <p>
            Ayudamos a miles de personas a transformar su cuerpo, su energia y su mentalidad con
            productos de calidad y asesoramiento real.
          </p>
        </div>
      </section>

      <section className="container section-space story-block no-image">
        <article>
          <h3>Todo empezo con una idea simple</h3>
          <p>
            Desde Olavarria, Argentina, comenzamos como un local apasionado por la nutricion
            deportiva. Con el tiempo crecimos gracias a la confianza de miles de clientes.
          </p>
          <p>
            Hoy combinamos atencion personalizada, envios rapidos y una plataforma web pensada para
            que comprar suplementos sea mas facil.
          </p>
          <ul className="story-points">
            <li>Asesoramiento cercano segun tus objetivos.</li>
            <li>Promociones reales y combos con stock actualizado.</li>
            <li>Compra simple: carrito + cierre por WhatsApp.</li>
          </ul>
        </article>

        <article className="about-highlight-card">
          <h4>Nuestra forma de trabajar</h4>
          <p>
            Queremos que cada cliente se lleve una recomendacion concreta, sin vueltas y adaptada a
            su presupuesto.
          </p>
          <p>
            Priorizamos transparencia en precios, control de stock y seguimiento de pedidos para que
            toda la experiencia sea clara de punta a punta.
          </p>
          <div className="about-stats">
            <div>
              <strong>+5.000</strong>
              <span>pedidos gestionados</span>
            </div>
            <div>
              <strong>24 hs</strong>
              <span>respuesta por WhatsApp</span>
            </div>
            <div>
              <strong>9 estados</strong>
              <span>seguimiento del pedido</span>
            </div>
          </div>
        </article>
      </section>

      <section className="container values-grid section-space">
        <article>
          <h4>Atencion cercana</h4>
          <p>Asesoramiento honesto segun objetivos: rendimiento, fuerza, masa o salud general.</p>
        </article>
        <article>
          <h4>Marcas de confianza</h4>
          <p>Trabajamos con suplementos de calidad y opciones para todos los presupuestos.</p>
        </article>
        <article>
          <h4>Compra simple</h4>
          <p>Carrito, checkout y cierre por WhatsApp para mantener una experiencia agil y directa.</p>
        </article>
      </section>
    </div>
  );
}

export default AboutPage;

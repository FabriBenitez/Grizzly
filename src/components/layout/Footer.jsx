function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h4>Categorías</h4>
          <ul>
            <li>Inicio</li>
            <li>Promos</li>
            <li>Productos</li>
            <li>Quiénes Somos</li>
            <li>Seguí tu pedido</li>
            <li>Instrucciones / Ayuda</li>
          </ul>
        </div>
        <div>
          <h4>Otros</h4>
          <ul>
            <li>Política de Devolución</li>
            <li>Términos y Condiciones</li>
            <li>Preguntas frecuentes</li>
            <li>Trabajá con nosotros</li>
          </ul>
        </div>
        <div>
          <h4>Contactanos</h4>
          <ul>
            <li>WhatsApp: +54 9 2284 123456</li>
            <li>Olavarría, Buenos Aires</li>
            <li>Lunes a Sábado 9 a 20 hs</li>
          </ul>
        </div>
        <div>
          <h4>Newsletter</h4>
          <form className="newsletter-form" onSubmit={(event) => event.preventDefault()}>
            <input type="email" placeholder="Ingresá tu email..." />
            <button type="submit">ENVIAR</button>
          </form>
        </div>
      </div>
      <div className="container payment-badges">
        <span>Visa</span>
        <span>Mastercard</span>
        <span>Naranja</span>
        <span>Mercado Pago</span>
        <span>Transferencia</span>
        <span>Efectivo</span>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Grizzly Suplementos</div>
    </footer>
  );
}

export default Footer;

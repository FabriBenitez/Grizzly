import { Link } from "react-router-dom";
import estilos from "./Footer.module.scss";

function Footer() {
  return (
    <footer className={estilos.pie}>
      <div className={`container ${estilos["pie__grid"]}`}>
        <div className={estilos["pie__columna"]}>
          <h2 className={estilos["pie__titulo"]}>Categorías</h2>
          <ul className={estilos["pie__lista"]}>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/promos">Promos</Link></li>
            <li><Link to="/catalogo">Productos</Link></li>
            <li><Link to="/quienes-somos">Quiénes somos</Link></li>
            <li><Link to="/seguimiento">Seguí tu pedido</Link></li>
            <li><Link to="/cuenta">Ayuda y pedidos</Link></li>
          </ul>
        </div>

        <div className={estilos["pie__columna"]}>
          <h2 className={estilos["pie__titulo"]}>Información</h2>
          <ul className={estilos["pie__lista"]}>
            <li>Términos y condiciones</li>
            <li>Política de devolución</li>
            <li>Preguntas frecuentes</li>
            <li>Trabajá con nosotros</li>
          </ul>
        </div>

        <address className={estilos["pie__columna"]}>
          <h2 className={estilos["pie__titulo"]}>Contacto</h2>
          <ul className={estilos["pie__lista"]}>
            <li>WhatsApp: +54 9 2284 123456</li>
            <li>Olavarría, Buenos Aires</li>
            <li>Lunes a sábado de 9 a 20 hs</li>
          </ul>
        </address>

        <div className={estilos["pie__columna"]}>
          <h2 className={estilos["pie__titulo"]}>Newsletter</h2>
          <form
            className={estilos["pie__newsletter"]}
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="newsletter-email" className="oculto-visualmente">
              Ingresá tu email para recibir novedades
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Ingresá tu email"
              className={estilos["pie__newsletter-input"]}
            />
            <button type="submit" className={estilos["pie__newsletter-boton"]}>
              Enviar
            </button>
          </form>
        </div>
      </div>

      <div className={`container ${estilos["pie__pagos"]}`} aria-label="Medios de pago">
        <span>Visa</span>
        <span>Mastercard</span>
        <span>Naranja</span>
        <span>Mercado Pago</span>
        <span>Transferencia</span>
        <span>Efectivo</span>
      </div>

      <div className={`container ${estilos["pie__base"]}`}>
        © {new Date().getFullYear()} Grizzly Suplementos
      </div>
    </footer>
  );
}

export default Footer;

import { Link } from "react-router-dom";
import { STOREFRONT_CONTACT } from "../../data/storefrontContent";
import estilos from "./Footer.module.scss";

function Footer() {
  return (
    <footer className={estilos.pie}>
      <div className={`container ${estilos["pie__grid"]}`}>
        <div className={estilos["pie__columna"]}>
          <h2 className={estilos["pie__titulo"]}>Categorias</h2>
          <ul className={estilos["pie__lista"]}>
            <li>
              <Link to="/">Inicio</Link>
            </li>
            <li>
              <Link to="/promos">Promos</Link>
            </li>
            <li>
              <Link to="/catalogo">Productos</Link>
            </li>
            <li>
              <Link to="/quienes-somos">Quienes somos</Link>
            </li>
            <li>
              <Link to="/seguimiento">Segui tu pedido</Link>
            </li>
            <li>
              <Link to="/faq">Centro de ayuda</Link>
            </li>
          </ul>
        </div>

        <div className={estilos["pie__columna"]}>
          <h2 className={estilos["pie__titulo"]}>Informacion</h2>
          <ul className={estilos["pie__lista"]}>
            <li>
              <Link to="/faq#pagos">Pagos y checkout</Link>
            </li>
            <li>
              <Link to="/faq#envios">Envios y retiros</Link>
            </li>
            <li>
              <Link to="/faq#cambios">Cambios y consultas</Link>
            </li>
            <li>
              <Link to="/faq#faq">Preguntas frecuentes</Link>
            </li>
          </ul>
        </div>

        <address className={estilos["pie__columna"]}>
          <h2 className={estilos["pie__titulo"]}>Contacto</h2>
          <ul className={estilos["pie__lista"]}>
            <li>
              <a href={STOREFRONT_CONTACT.whatsappUrl} target="_blank" rel="noreferrer">
                WhatsApp para consultas
              </a>
            </li>
            <li>{STOREFRONT_CONTACT.location}</li>
            <li>{STOREFRONT_CONTACT.hours}</li>
          </ul>
        </address>

        <div className={estilos["pie__columna"]}>
          <h2 className={estilos["pie__titulo"]}>Newsletter</h2>
          <form
            className={estilos["pie__newsletter"]}
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="newsletter-email" className="oculto-visualmente">
              Ingresa tu email para recibir novedades
            </label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="Ingresa tu email"
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
        <span>Debito</span>
      </div>

      <div className={`container ${estilos["pie__base"]}`}>
        &copy; {new Date().getFullYear()} Grizzly Suplementos
      </div>
    </footer>
  );
}

export default Footer;

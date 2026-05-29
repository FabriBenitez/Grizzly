import { Link } from "react-router-dom";
import SeoPagina from "../shared/seo/SeoPagina";
import {
  STOREFRONT_CONTACT,
  STOREFRONT_FAQS,
  STOREFRONT_PAYMENT_POINTS,
  STOREFRONT_POLICY_POINTS,
  STOREFRONT_PURCHASE_STEPS,
  STOREFRONT_SHIPPING_POINTS,
  STOREFRONT_SUPPORT_POINTS,
} from "../data/storefrontContent";
import { useStoreSettings } from "../context/StoreSettingsContext";

function AccountPage() {
  const { whatsapp_number } = useStoreSettings();
  const whatsappUrl = whatsapp_number
    ? `https://wa.me/${whatsapp_number}?text=${encodeURIComponent("Hola Grizzly, necesito ayuda con una consulta, una compra o un pedido.")}`
    : STOREFRONT_CONTACT.whatsappUrl;

  return (
    <div className="container section-space account-page help-center-page">
      <SeoPagina
        titulo="Centro de ayuda | Grizzly Suplementos"
        descripcion="Resuelve dudas sobre compra, envios, pagos, cambios y seguimiento de pedidos en Grizzly Suplementos."
        rutaCanonical="/faq"
      />

      <header className="section-title">
        <p>Centro de ayuda</p>
        <h1>Compra online, seguimiento y soporte en un solo lugar</h1>
        <span>
          Aqui encuentras como comprar, como enviamos tu pedido y cuando escribirnos por
          WhatsApp si necesitas una mano.
        </span>
      </header>

      <div className="account-auth-grid help-center-hero-grid">
        <article className="account-card help-center-card">
          <p className="help-center-kicker">Como comprar</p>
          <h2>Un checkout claro de punta a punta</h2>
          <ol className="help-center-list help-center-list--ordered">
            {STOREFRONT_PURCHASE_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <div className="help-center-actions">
            <Link to="/catalogo" className="btn-outline">
              Ver catalogo
            </Link>
            <Link to="/checkout" className="btn-primary">
              Ir al checkout
            </Link>
          </div>
        </article>

        <article className="account-card help-center-card">
          <p className="help-center-kicker">Seguimiento y soporte</p>
          <h2>Tu pedido no depende de abrir un chat para avanzar</h2>
          <ul className="help-center-list">
            <li>Recibes confirmacion por email cuando el pedido queda registrado.</li>
            <li>El tracking publico te muestra el estado del pedido con tus datos de compra.</li>
            <li>WhatsApp queda disponible para consultas, seguimiento y ayuda puntual.</li>
          </ul>

          <div className="help-center-actions">
            <Link to="/seguimiento" className="btn-outline">
              Seguir mi pedido
            </Link>
            <a href={whatsappUrl} className="btn-primary" target="_blank" rel="noreferrer">
              Consultar por WhatsApp
            </a>
          </div>
        </article>
      </div>

      <section className="help-center-shortcuts" aria-label="Accesos rapidos de ayuda">
        <a href="#envios" className="help-center-shortcut">
          Envios
        </a>
        <a href="#pagos" className="help-center-shortcut">
          Pagos
        </a>
        <a href="#cambios" className="help-center-shortcut">
          Cambios
        </a>
        <a href="#faq" className="help-center-shortcut">
          FAQ
        </a>
        <a href="#contacto" className="help-center-shortcut">
          Contacto
        </a>
      </section>

      <section className="help-center-grid">
        <article id="envios" className="account-card help-center-panel">
          <p className="help-center-kicker">Envios</p>
          <h2>Entrega a domicilio o retiro por sucursal</h2>
          <ul className="help-center-list">
            {STOREFRONT_SHIPPING_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>

        <article id="pagos" className="account-card help-center-panel">
          <p className="help-center-kicker">Pagos</p>
          <h2>Pago online con resumen final antes de confirmar</h2>
          <ul className="help-center-list">
            {STOREFRONT_PAYMENT_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>

        <article id="cambios" className="account-card help-center-panel">
          <p className="help-center-kicker">Cambios y ajustes</p>
          <h2>Te ayudamos si algo cambia antes del despacho</h2>
          <ul className="help-center-list">
            {STOREFRONT_POLICY_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>

        <article id="contacto" className="account-card help-center-panel help-center-panel--support">
          <p className="help-center-kicker">Contacto</p>
          <h2>WhatsApp como soporte complementario</h2>
          <ul className="help-center-list">
            {STOREFRONT_SUPPORT_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <div className="help-center-contact-meta">
            <strong>{STOREFRONT_CONTACT.whatsappLabel}</strong>
            <span>{STOREFRONT_CONTACT.location}</span>
            <span>{STOREFRONT_CONTACT.hours}</span>
          </div>

          <a href={whatsappUrl} className="btn-outline" target="_blank" rel="noreferrer">
            Abrir WhatsApp
          </a>
        </article>
      </section>

      <section id="faq" className="section-space">
        <div className="section-title">
          <p>Preguntas frecuentes</p>
          <h2>Respuestas rapidas para comprar con confianza</h2>
          <span>
            Si tu duda no aparece aqui, puedes escribirnos con tu numero de pedido o tu consulta.
          </span>
        </div>

        <div className="help-center-faq-grid">
          {STOREFRONT_FAQS.map((item) => (
            <article key={item.question} className="account-card help-center-faq-card">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AccountPage;

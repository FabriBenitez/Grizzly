import { Link } from "react-router-dom";

function AccountPage() {
  return (
    <div className="container section-space account-page">
      <header className="section-title">
        <p>Ayuda y pedidos</p>
        <h1>No necesitas crear una cuenta para comprar</h1>
        <span>
          Hace tu pedido, coordina el pago por WhatsApp y segui el estado con tu numero de
          pedido.
        </span>
      </header>

      <div className="account-auth-grid">
        <article className="account-card">
          <h2>Como comprar</h2>
          <p>
            Elegi tus productos, completa el checkout y envia el pedido por WhatsApp. No hace
            falta registrarse para finalizar la compra.
          </p>
          <Link to="/checkout" className="btn-primary full">
            Ir al checkout
          </Link>
        </article>

        <article className="account-card">
          <h2>Seguimiento de pedido</h2>
          <p>
            Si ya compraste, podes consultar el estado con tu numero de pedido y el telefono que
            usaste al comprar.
          </p>
          <Link to="/seguimiento" className="btn-outline full">
            Seguir mi pedido
          </Link>
        </article>
      </div>
    </div>
  );
}

export default AccountPage;

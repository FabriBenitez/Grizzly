import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <section className="container section-space empty-box">
      <h1>404</h1>
      <h2>Página no encontrada</h2>
      <p>La ruta que buscás no existe o fue movida.</p>
      <Link to="/" className="btn-primary">
        Volver al inicio
      </Link>
    </section>
  );
}

export default NotFoundPage;

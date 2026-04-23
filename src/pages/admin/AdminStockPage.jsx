import { useMemo, useState } from "react";
import { products } from "../../data/products";

const STOCK_THRESHOLD_KEY = "grizzly_low_stock_threshold";

function readThreshold() {
  try {
    const raw = window.localStorage.getItem(STOCK_THRESHOLD_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 12;
  } catch {
    return 12;
  }
}

function writeThreshold(value) {
  window.localStorage.setItem(STOCK_THRESHOLD_KEY, String(value));
}

function getStockLevel(stock, threshold) {
  if (stock <= Math.max(1, Math.floor(threshold / 2))) {
    return "critico";
  }
  if (stock <= threshold) {
    return "bajo";
  }
  return "ok";
}

function AdminStockPage() {
  const [threshold, setThreshold] = useState(readThreshold());

  const rows = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          level: getStockLevel(product.stock, threshold),
        }))
        .sort((a, b) => a.stock - b.stock),
    [threshold],
  );

  const summary = useMemo(() => {
    const critical = rows.filter((row) => row.level === "critico").length;
    const low = rows.filter((row) => row.level === "bajo").length;
    const ok = rows.filter((row) => row.level === "ok").length;
    return { critical, low, ok };
  }, [rows]);

  const applyThreshold = (event) => {
    event.preventDefault();
    const safe = Math.max(1, Number(threshold || 1));
    setThreshold(safe);
    writeThreshold(safe);
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Stock</p>
        <h1>Definicion de stock bajo global</h1>
        <span>
          Configura un unico umbral para todos los productos y detecta rapidamente niveles criticos.
        </span>
      </header>

      <section className="admin-card">
        <h2>Configuracion global</h2>
        <form className="admin-threshold-form" onSubmit={applyThreshold}>
          <label>
            Umbral de stock bajo para toda la tienda
            <input
              type="number"
              min="1"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value || 1))}
            />
          </label>
          <button type="submit">Guardar umbral</button>
        </form>
        <p className="admin-threshold-help">
          Regla actual: stock <b>{"<="}</b> {threshold} se marca como bajo. Stock <b>{"<="}</b>{" "}
          {Math.max(1, Math.floor(threshold / 2))} se marca como critico.
        </p>
      </section>

      <section className="admin-kpi-grid">
        <article>
          <p>Productos criticos</p>
          <strong>{summary.critical}</strong>
        </article>
        <article>
          <p>Productos bajos</p>
          <strong>{summary.low}</strong>
        </article>
        <article>
          <p>Stock saludable</p>
          <strong>{summary.ok}</strong>
        </article>
        <article>
          <p>Total productos</p>
          <strong>{rows.length}</strong>
        </article>
      </section>

      <section className="admin-card">
        <h2>Estado de inventario por producto</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Stock actual</th>
                <th>Umbral</th>
                <th>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="table-product">
                      <img src={product.image} alt={product.name} />
                      <div>
                        <b>{product.name}</b>
                        <small>{product.brand}</small>
                      </div>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>{product.stock} u.</td>
                  <td>{threshold} u.</td>
                  <td>
                    <span className={`stock-pill ${product.level}`}>
                      {product.level === "critico" ? "Critico" : product.level === "bajo" ? "Bajo" : "OK"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminStockPage;

import { useMemo, useState } from "react";
import { AlertCircle, Boxes, PackageCheck, TriangleAlert } from "lucide-react";
import AdminStatCard from "../../components/admin/AdminStatCard";
import { useAdminCatalogData } from "../../hooks/useAdminCatalogData";
import { getStockLevel, getStockPercent } from "../../shared/catalog/stockLevels";
import { useStoreSettings } from "../../context/StoreSettingsContext";
import { saveStoreSetting } from "../../utils/settings.remote";

function AdminStockPage() {
  const { products, setProducts, loading, saving, error, saveProducts } =
    useAdminCatalogData();
  const { stock_threshold: contextThreshold } = useStoreSettings();
  const [threshold, setThreshold] = useState(contextThreshold);
  const [message, setMessage] = useState("");

  const rows = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          level: getStockLevel(product.stock, threshold),
          percent: getStockPercent(product.stock, threshold),
        }))
        .sort((a, b) => a.stock - b.stock),
    [products, threshold],
  );

  const summary = useMemo(() => {
    const critical = rows.filter((row) => row.level === "critico").length;
    const low = rows.filter((row) => row.level === "bajo").length;
    const ok = rows.filter((row) => row.level === "ok").length;
    return { critical, low, ok };
  }, [rows]);

  const applyThreshold = async (event) => {
    event.preventDefault();
    const safe = Math.max(1, Number(threshold || 1));
    setThreshold(safe);
    try {
      await saveStoreSetting("stock_threshold", String(safe), "Umbral global de stock bajo");
      setMessage("Umbral global de stock actualizado.");
    } catch {
      setMessage("No pudimos guardar el umbral en la base.");
    }
  };

  const updateStock = (productId, nextValue) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? { ...product, stock: Math.max(0, Number(nextValue || 0)) }
          : product,
      ),
    );
    setMessage("");
  };

  const saveInventory = async () => {
    try {
      await saveProducts(products);
      setMessage("Inventario sincronizado con la base actual.");
    } catch {
      setMessage("Actualizamos el stock en pantalla, pero no pudimos persistirlo todavia.");
    }
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Stock</p>
        <h1>Definicion de stock bajo global</h1>
        <span>
          Configura un unico umbral para todos los productos y actualiza el inventario real desde
          un solo lugar.
        </span>
      </header>

      {loading && <section className="admin-demo-note">Cargando stock real...</section>}
      {!loading && error && <section className="admin-demo-note">{error}</section>}

      <section className="admin-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Configuracion</span>
            <h2>Umbral global de inventario</h2>
          </div>
        </div>
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
        {message && <p className="admin-message">{message}</p>}
      </section>

      <section className="admin-kpi-grid">
        <AdminStatCard
          icon={TriangleAlert}
          title="Productos criticos"
          value={summary.critical}
          helper="Necesitan reposicion inmediata."
          tone="danger"
        />
        <AdminStatCard
          icon={AlertCircle}
          title="Productos bajos"
          value={summary.low}
          helper="Todavia venden, pero ya merecen seguimiento."
          tone="warn"
        />
        <AdminStatCard
          icon={PackageCheck}
          title="Stock saludable"
          value={summary.ok}
          helper="Estan por encima del umbral definido."
        />
        <AdminStatCard
          icon={Boxes}
          title="Total productos"
          value={rows.length}
          helper="Catalogo hoy controlado desde inventario."
          tone="highlight"
        />
      </section>

      <section className="admin-card admin-table-card">
        <div className="admin-card-title">
          <div>
            <span className="admin-card-kicker">Inventario actual</span>
            <h2>Estado de inventario por producto</h2>
          </div>
          <button type="button" onClick={saveInventory} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar stock"}
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table admin-stock-table">
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
                  <td>
                    <div className="stock-level-cell">
                      <label className="products-table-input-shell unit">
                        <span>u</span>
                        <input
                          type="number"
                          min="0"
                          value={product.stock}
                          onChange={(event) => updateStock(product.id, event.target.value)}
                        />
                      </label>
                      <span>
                        <i className={product.level} style={{ width: `${product.percent}%` }} />
                      </span>
                    </div>
                  </td>
                  <td>{threshold} u.</td>
                  <td>
                    <span className={`stock-pill ${product.level}`}>
                      {product.level === "critico"
                        ? "Critico"
                        : product.level === "bajo"
                          ? "Bajo"
                          : "Saludable"}
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

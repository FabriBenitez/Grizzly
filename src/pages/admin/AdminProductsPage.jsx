import { useMemo, useState } from "react";
import { products as initialProducts } from "../../data/products";
import { formatCurrency } from "../../utils/currency";

function AdminProductsPage() {
  const [products, setProducts] = useState(
    initialProducts.map((product) => ({
      ...product,
      active: true,
      highlighted: Boolean(product.featured),
    })),
  );
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    category: "",
    brand: "",
    price: "",
    stock: "",
  });
  const [message, setMessage] = useState("");

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term),
    );
  }, [products, query]);

  const updateField = (id, key, value) => {
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? { ...product, [key]: value } : product)),
    );
    setMessage("");
  };

  const saveChanges = () => {
    setMessage("Cambios de productos guardados en modo demo (frontend).");
  };

  const createProduct = (event) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.category.trim() || !draft.brand.trim()) {
      setMessage("Completa nombre, categoria y marca para crear producto demo.");
      return;
    }

    const id = `demo_${Date.now()}`;
    setProducts((prev) => [
      {
        id,
        slug: `${draft.name.toLowerCase().replace(/\s+/g, "-")}-${id}`,
        name: draft.name.trim(),
        brand: draft.brand.trim(),
        category: draft.category.trim(),
        objective: "General",
        price: Number(draft.price || 0),
        promoPrice: null,
        transferPrice: Number(draft.price || 0),
        rating: 0,
        reviews: 0,
        stock: Number(draft.stock || 0),
        sold: 0,
        featured: false,
        promo: false,
        combo: false,
        active: true,
        highlighted: false,
        image: "/assets/products/creatina-300-bag.jpg",
        gallery: ["/assets/products/creatina-300-bag.jpg"],
        description: "Producto demo creado desde el panel admin.",
      },
      ...prev,
    ]);
    setDraft({ name: "", category: "", brand: "", price: "", stock: "" });
    setMessage("Producto demo creado correctamente.");
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Productos</p>
        <h1>ABM de catalogo y precios</h1>
        <span>
          Alta, baja logica, modificacion de precios, stock, destacados y estado activo/inactivo.
        </span>
      </header>

      <section className="admin-card">
        <h2>Que significa \"Destacado\"</h2>
        <p>
          Un producto marcado como <b>Destacado</b> se prioriza en la home y en bloques comerciales
          como \"Los mas elegidos\" o secciones de recomendados.
        </p>
        <p>
          Sirve para empujar productos con mejor margen, promociones activas o lanzamientos.
        </p>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            type="search"
            value={query}
            placeholder="Buscar por nombre, marca o categoria"
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" onClick={saveChanges}>
            Guardar cambios
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Precio</th>
                <th>Promo</th>
                <th>Stock</th>
                <th>Activo</th>
                <th>Destacado</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((product) => (
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
                    <input
                      type="number"
                      value={product.price}
                      onChange={(event) =>
                        updateField(product.id, "price", Number(event.target.value || 0))
                      }
                    />
                    <small>{formatCurrency(product.price)}</small>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={product.promoPrice || ""}
                      placeholder="Sin promo"
                      onChange={(event) =>
                        updateField(
                          product.id,
                          "promoPrice",
                          event.target.value === "" ? null : Number(event.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={product.stock}
                      onChange={(event) =>
                        updateField(product.id, "stock", Number(event.target.value || 0))
                      }
                    />
                  </td>
                  <td>
                    <label className="switch-inline">
                      <input
                        type="checkbox"
                        checked={product.active}
                        onChange={(event) => updateField(product.id, "active", event.target.checked)}
                      />
                      <span>{product.active ? "Activo" : "Inactivo"}</span>
                    </label>
                  </td>
                  <td>
                    <label className="switch-inline">
                      <input
                        type="checkbox"
                        checked={product.highlighted}
                        onChange={(event) =>
                          updateField(product.id, "highlighted", event.target.checked)
                        }
                      />
                      <span>{product.highlighted ? "Si" : "No"}</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Alta rapida de producto (demo frontend)</h2>
        <form className="admin-inline-form" onSubmit={createProduct}>
          <input
            type="text"
            placeholder="Nombre producto"
            value={draft.name}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            type="text"
            placeholder="Categoria"
            value={draft.category}
            onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
          />
          <input
            type="text"
            placeholder="Marca"
            value={draft.brand}
            onChange={(event) => setDraft((prev) => ({ ...prev, brand: event.target.value }))}
          />
          <input
            type="number"
            placeholder="Precio"
            value={draft.price}
            onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
          />
          <input
            type="number"
            placeholder="Stock"
            value={draft.stock}
            onChange={(event) => setDraft((prev) => ({ ...prev, stock: event.target.value }))}
          />
          <button type="submit">Crear producto</button>
        </form>
        {message && <p className="admin-message">{message}</p>}
      </section>
    </div>
  );
}

export default AdminProductsPage;

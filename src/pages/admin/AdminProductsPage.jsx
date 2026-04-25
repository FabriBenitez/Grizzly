import { useMemo, useState } from "react";
import { products as initialProducts } from "../../data/products";
import { formatCurrency } from "../../utils/currency";

const excelColumns = [
  "SKU",
  "Nombre",
  "Categoria",
  "Marca",
  "Precio",
  "Precio transferencia",
  "Stock",
  "Imagen principal",
];

const excelPreviewRows = [
  {
    sku: "CREA-300-ST",
    name: "Creatina Monohidrato 300g",
    category: "Creatina",
    brand: "Star Nutrition",
    price: "41900",
    transferPrice: "23898",
    stock: "44",
    image: "https://...",
  },
  {
    sku: "WHEY-2LB-ST",
    name: "Whey Protein 2lb",
    category: "Proteina",
    brand: "Star Nutrition",
    price: "59100",
    transferPrice: "41916",
    stock: "31",
    image: "https://...",
  },
];

function moveItem(array, fromIndex, toIndex) {
  const next = [...array];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function AdminProductsPage() {
  const [products, setProducts] = useState(
    initialProducts.map((product, index) => ({
      ...product,
      sku: product.sku || `SKU-${String(index + 1).padStart(4, "0")}`,
      active: true,
      highlighted: Boolean(product.featured),
      gallery: product.gallery || [product.image],
    })),
  );
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({
    sku: "",
    name: "",
    category: "",
    brand: "",
    price: "",
    transferPrice: "",
    stock: "",
  });
  const [message, setMessage] = useState("");
  const [excelFileName, setExcelFileName] = useState("");
  const [excelMessage, setExcelMessage] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(initialProducts[0]?.id || "");
  const [galleryUrl, setGalleryUrl] = useState("");
  const [galleryMessage, setGalleryMessage] = useState("");

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.brand.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term),
    );
  }, [products, query]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) || products[0] || null;

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
    if (!draft.sku.trim() || !draft.name.trim() || !draft.category.trim() || !draft.brand.trim()) {
      setMessage("Completa SKU, nombre, categoria y marca para crear el producto demo.");
      return;
    }

    const id = `demo_${Date.now()}`;
    const image = "/assets/products/creatina-300-bag.jpg";

    setProducts((prev) => [
      {
        id,
        sku: draft.sku.trim(),
        slug: `${draft.name.toLowerCase().replace(/\s+/g, "-")}-${id}`,
        name: draft.name.trim(),
        brand: draft.brand.trim(),
        category: draft.category.trim(),
        objective: "General",
        price: Number(draft.price || 0),
        promoPrice: null,
        transferPrice: Number(draft.transferPrice || draft.price || 0),
        rating: 0,
        reviews: 0,
        stock: Number(draft.stock || 0),
        sold: 0,
        featured: false,
        promo: false,
        combo: false,
        active: true,
        highlighted: false,
        image,
        gallery: [image],
        description: "Producto demo creado desde el panel admin.",
      },
      ...prev,
    ]);

    setDraft({
      sku: "",
      name: "",
      category: "",
      brand: "",
      price: "",
      transferPrice: "",
      stock: "",
    });
    setMessage("Producto demo creado correctamente.");
  };

  const handleExcelFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setExcelFileName(file.name);
    setExcelMessage(
      "Vista lista: el siguiente paso seria parsear el Excel, validar columnas y crear solo productos nuevos.",
    );
  };

  const appendImagesToProduct = (productId, newImages) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) {
          return product;
        }

        const nextGallery = [...(product.gallery || []), ...newImages];
        return {
          ...product,
          image: product.image || nextGallery[0],
          gallery: nextGallery,
        };
      }),
    );
  };

  const handleGalleryFiles = (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length || !selectedProduct) {
      return;
    }

    const imageUrls = files.map((file) => URL.createObjectURL(file));
    appendImagesToProduct(selectedProduct.id, imageUrls);
    setGalleryMessage(`${files.length} imagenes agregadas a la galeria en modo demo.`);
    event.target.value = "";
  };

  const addGalleryUrl = () => {
    if (!galleryUrl.trim() || !selectedProduct) {
      return;
    }

    appendImagesToProduct(selectedProduct.id, [galleryUrl.trim()]);
    setGalleryUrl("");
    setGalleryMessage("Imagen agregada a la galeria del producto.");
  };

  const removeGalleryImage = (imageIndex) => {
    if (!selectedProduct) {
      return;
    }

    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== selectedProduct.id) {
          return product;
        }

        const nextGallery = product.gallery.filter((_, index) => index !== imageIndex);
        return {
          ...product,
          image: nextGallery[0] || product.image,
          gallery: nextGallery.length ? nextGallery : [product.image],
        };
      }),
    );
    setGalleryMessage("Imagen quitada de la galeria.");
  };

  const moveGalleryImage = (imageIndex, direction) => {
    if (!selectedProduct) {
      return;
    }

    const nextIndex = direction === "left" ? imageIndex - 1 : imageIndex + 1;
    if (nextIndex < 0 || nextIndex >= selectedProduct.gallery.length) {
      return;
    }

    setProducts((prev) =>
      prev.map((product) => {
        if (product.id !== selectedProduct.id) {
          return product;
        }

        const nextGallery = moveItem(product.gallery, imageIndex, nextIndex);
        return {
          ...product,
          image: nextGallery[0],
          gallery: nextGallery,
        };
      }),
    );
    setGalleryMessage("Orden de galeria actualizado.");
  };

  return (
    <div className="admin-page-root">
      <header className="admin-page-header">
        <p>Productos</p>
        <h1>ABM de catalogo, importacion y galerias</h1>
        <span>
          Alta rapida, edicion de precios, vista de carga por Excel y gestion multiple de imagenes
          por producto.
        </span>
      </header>

      <section className="admin-card">
        <h2>Que significa "Destacado"</h2>
        <p>
          Un producto marcado como <b>Destacado</b> se prioriza en la home y en bloques comerciales
          como "Los mas elegidos" o secciones de recomendados.
        </p>
        <p>
          Sirve para empujar productos con mejor margen, promos activas o lanzamientos.
        </p>
      </section>

      <section className="admin-two-col">
        <article className="admin-card">
          <h2>Carga de productos por Excel</h2>
          <div className="admin-upload-box">
            <p>Subi un archivo `.xlsx`, `.xls` o `.csv` para preparar una carga masiva.</p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFileChange} />
            <small>
              Alcance actual del prototipo: vista para carga de <b>productos nuevos</b>. No pisa
              productos existentes.
            </small>
            {excelFileName && <strong>{excelFileName}</strong>}
          </div>
          <div className="excel-columns-grid">
            {excelColumns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
          {excelMessage && <p className="admin-message">{excelMessage}</p>}
        </article>

        <article className="admin-card">
          <h2>Vista previa del formato</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {excelColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excelPreviewRows.map((row) => (
                  <tr key={row.sku}>
                    <td>{row.sku}</td>
                    <td>{row.name}</td>
                    <td>{row.category}</td>
                    <td>{row.brand}</td>
                    <td>{row.price}</td>
                    <td>{row.transferPrice}</td>
                    <td>{row.stock}</td>
                    <td>{row.image}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <input
            type="search"
            value={query}
            placeholder="Buscar por SKU, nombre, marca o categoria"
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
                <th>SKU</th>
                <th>Categoria</th>
                <th>Precio</th>
                <th>Transferencia</th>
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
                  <td>{product.sku}</td>
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
                      value={product.transferPrice || ""}
                      onChange={(event) =>
                        updateField(product.id, "transferPrice", Number(event.target.value || 0))
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

      <section className="admin-two-col">
        <article className="admin-card">
          <h2>Alta rapida de producto (demo frontend)</h2>
          <form className="admin-inline-form product-inline-form" onSubmit={createProduct}>
            <input
              type="text"
              placeholder="SKU"
              value={draft.sku}
              onChange={(event) => setDraft((prev) => ({ ...prev, sku: event.target.value }))}
            />
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
              placeholder="Precio transferencia"
              value={draft.transferPrice}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, transferPrice: event.target.value }))
              }
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
        </article>

        <article className="admin-card">
          <h2>Subida multiple de imagenes por producto</h2>
          <div className="gallery-admin-toolbar">
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input type="file" accept="image/*" multiple onChange={handleGalleryFiles} />
          </div>
          <div className="gallery-url-row">
            <input
              type="url"
              placeholder="O pega una URL de imagen"
              value={galleryUrl}
              onChange={(event) => setGalleryUrl(event.target.value)}
            />
            <button type="button" onClick={addGalleryUrl}>
              Agregar URL
            </button>
          </div>
          <ul className="gallery-admin-list">
            {(selectedProduct?.gallery || []).map((image, index) => (
              <li key={`${selectedProduct?.id}-${image}-${index}`}>
                <img src={image} alt={`${selectedProduct?.name} ${index + 1}`} />
                <div>
                  <b>Imagen {index + 1}</b>
                  <small>{index === 0 ? "Principal" : "Secundaria"}</small>
                </div>
                <div className="promo-actions">
                  <button type="button" onClick={() => moveGalleryImage(index, "left")}>
                    Subir
                  </button>
                  <button type="button" onClick={() => moveGalleryImage(index, "right")}>
                    Bajar
                  </button>
                  <button type="button" onClick={() => removeGalleryImage(index)}>
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="admin-threshold-help">
            Flujo sugerido: subis varias imagenes, reordenas la principal, quitas las que sobran y
            guardas la galeria del producto.
          </p>
          {galleryMessage && <p className="admin-message">{galleryMessage}</p>}
        </article>
      </section>
    </div>
  );
}

export default AdminProductsPage;

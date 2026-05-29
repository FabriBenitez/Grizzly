import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileSpreadsheet,
  ImagePlus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useAdminCatalogData } from "../../hooks/useAdminCatalogData";
import { formatCurrency } from "../../utils/currency";
import {
  CATALOG_IMAGE_PLACEHOLDER,
  isCatalogPlaceholderImage,
} from "../../utils/catalogMedia";
import {
  buildCatalogImportSummary,
  parseCatalogImportFile,
} from "../../utils/catalogImport";

const excelColumns = [
  "SKU",
  "Nombre",
  "Categoria",
  "Marca",
  "Precio",
  "Precio transferencia",
  "Stock",
  "Imagen principal",
  "Descripcion",
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
    description: "Creatina monohidrato micronizada para fuerza y recuperacion.",
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
    description: "Proteina whey de rapida absorcion para recuperacion post entrenamiento.",
  },
];

function moveItem(array, fromIndex, toIndex) {
  const next = [...array];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function AdminProductsPage() {
  const {
    products,
    categories,
    brands,
    setProducts,

    loading,
    saving,
    error,
    saveProducts,
    uploadImages,
  } = useAdminCatalogData();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState({
    sku: "",
    name: "",
    category: "",
    brand: "",
    price: "",
    transferPrice: "",
    stock: "",
    description: "",
    combo: false,
    searchTags: "",
  });
  const [message, setMessage] = useState("");
  const [excelFileName, setExcelFileName] = useState("");
  const [excelMessage, setExcelMessage] = useState("");
  const [excelImportRows, setExcelImportRows] = useState([]);
  const [excelImportSummary, setExcelImportSummary] = useState({
    total: 0,
    ready: 0,
    duplicates: 0,
    errors: 0,
  });
  const [importingExcel, setImportingExcel] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [galleryUrl, setGalleryUrl] = useState("");
  const [galleryMessage, setGalleryMessage] = useState("");

  useEffect(() => {
    if (!products.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(products[0]?.id || "");
    }
  }, [products, selectedProductId]);

  const visibleProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return products;
    }

    return products.filter(
      (product) =>
        (product.name || "").toLowerCase().includes(term) ||
        (product.brand || "").toLowerCase().includes(term) ||
        (product.category || "").toLowerCase().includes(term) ||
        (product.sku || "").toLowerCase().includes(term),
    );
  }, [products, query]);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) || products[0] || null;

  const updateField = (id, key, value) => {
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? { ...product, [key]: value } : product)),
    );
    setMessage("");
    setGalleryMessage("");
  };

  const saveChanges = async () => {
    try {
      await saveProducts(products);
      setMessage("Catalogo cargado y base de datos lista.");
    } catch {
      setMessage("Guardamos los cambios en pantalla, pero no pudimos persistirlos todavia.");
    }
  };

  const createProduct = async (event) => {
    event.preventDefault();
    if (!draft.sku.trim() || !draft.name.trim() || !draft.category.trim() || !draft.brand.trim()) {
      setMessage("Completa SKU, nombre, categoria y marca para crear el producto.");
      return;
    }

    const id = `demo_${Date.now()}`;
    const nextSku = draft.sku.trim();
    const nextProducts = [
      {
        id,
        sku: nextSku,
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
        combo: draft.combo || false,
        searchTags: draft.searchTags.trim() || "",
        active: true,
        highlighted: false,
        image: CATALOG_IMAGE_PLACEHOLDER,
        gallery: [],
        description: draft.description.trim() || "Producto creado desde el panel admin.",
      },
      ...products,
    ];

    setProducts(nextProducts);
    setSelectedProductId(id);
    setDraft({
      sku: "",
      name: "",
      category: "",
      brand: "",
      price: "",
      transferPrice: "",
      stock: "",
      description: "",
      combo: false,
      searchTags: "",
    });

    try {
      const saved = await saveProducts(nextProducts);
      const savedProduct = saved.find((product) => product.sku === nextSku);
      setSelectedProductId(savedProduct?.id || saved[0]?.id || id);
      setMessage("Producto creado y guardado correctamente.");
    } catch {
      setMessage("Producto creado en pantalla. Falta persistirlo en la base.");
    }
  };

  const handleExcelFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = await parseCatalogImportFile(file, products);
      setExcelFileName(file.name);
      setExcelImportRows(parsed.rows);
      setExcelImportSummary(parsed.summary);
      setExcelMessage(
        parsed.summary.ready
          ? `Archivo listo: ${parsed.summary.ready} productos nuevos para importar.`
          : "Archivo procesado. Revisa duplicados o errores antes de continuar.",
      );
    } catch (parseError) {
      setExcelFileName(file.name);
      setExcelImportRows([]);
      setExcelImportSummary({
        total: 0,
        ready: 0,
        duplicates: 0,
        errors: 0,
      });
      setExcelMessage(
        parseError instanceof Error
          ? parseError.message
          : "No pudimos leer el archivo seleccionado.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const importExcelProducts = async () => {
    const readyProducts = excelImportRows
      .filter((row) => row.status === "ready" && row.product)
      .map((row) => row.product);

    if (!readyProducts.length) {
      setExcelMessage("No hay productos nuevos listos para importar en este archivo.");
      return;
    }

    const nextProducts = [...readyProducts, ...products];
    setImportingExcel(true);

    try {
      const saved = await saveProducts(nextProducts);
      const importedSkus = new Set(readyProducts.map((product) => product.sku));
      const importedCount = saved.filter((product) => importedSkus.has(product.sku)).length;
      setSelectedProductId(saved[0]?.id || "");
      setExcelMessage(`Importacion completa: ${importedCount} productos nuevos guardados.`);
      setExcelFileName("");
      setExcelImportRows([]);
      setExcelImportSummary({
        total: 0,
        ready: 0,
        duplicates: 0,
        errors: 0,
      });
    } catch {
      setExcelMessage("No pudimos persistir la importacion en la base.");
    } finally {
      setImportingExcel(false);
    }
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
          image:
            product.image && !isCatalogPlaceholderImage(product.image)
              ? product.image
              : nextGallery[0] || CATALOG_IMAGE_PLACEHOLDER,
          gallery: nextGallery,
        };
      }),
    );
  };

  const handleGalleryFiles = async (event) => {
    const files = [...(event.target.files || [])];
    if (!files.length || !selectedProduct) {
      return;
    }

    try {
      const imageUrls = await uploadImages(files, selectedProduct.name);
      appendImagesToProduct(selectedProduct.id, imageUrls);
      setGalleryMessage(`${files.length} imagenes subidas y listas para guardar en la galeria.`);
    } catch {
      setGalleryMessage("No pudimos subir las imagenes del producto.");
    } finally {
      event.target.value = "";
    }
  };

  const addGalleryUrl = () => {
    if (!galleryUrl.trim() || !selectedProduct) {
      return;
    }

    appendImagesToProduct(selectedProduct.id, [galleryUrl.trim()]);
    setGalleryUrl("");
    setGalleryMessage("Imagen agregada. Guarda cambios para persistir la galeria.");
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
        const nextImage = nextGallery[0] || CATALOG_IMAGE_PLACEHOLDER;
        return {
          ...product,
          image: nextImage,
          gallery: nextGallery,
        };
      }),
    );
    setGalleryMessage("Imagen quitada. Guarda cambios para actualizar la galeria real.");
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
          image: nextGallery[0] || CATALOG_IMAGE_PLACEHOLDER,
          gallery: nextGallery,
        };
      }),
    );
    setGalleryMessage("Orden actualizado. Guarda cambios para aplicar la nueva galeria.");
  };

  return (
    <div className="admin-page-root products-admin-page">
      <header className="admin-page-header products-admin-header">
        <p>Productos</p>
        <h1>ABM de catalogo, importacion y galerias</h1>
        <span>
          Alta rapida, edicion de precios, vista de carga por Excel y gestion multiple de imagenes
          por producto.
        </span>
        <div className="products-admin-header-meta">
          <span>
            <strong>{products.length}</strong> productos editables
          </span>
          <span>
            <strong>{categories.length}</strong> categorias reales
          </span>
          <span>
            <strong>{brands.length}</strong> marcas reales
          </span>
          <span>
            <strong>{visibleProducts.length}</strong> visibles en esta vista
          </span>
          <span>
            <strong>{selectedProduct?.gallery?.length || 0}</strong> imagenes en la galeria actual
          </span>
        </div>
      </header>

      {loading && <section className="admin-demo-note">Cargando catalogo real...</section>}
      {!loading && error && <section className="admin-demo-note">{error}</section>}

      <section className="admin-card products-highlight-card">
        <div className="products-section-head compact">
          <div>
            <p>Curaduria comercial</p>
            <h2>Que significa "Destacado"</h2>
          </div>
        </div>
        <p>
          Un producto marcado como <b>Destacado</b> se prioriza en la home y en bloques comerciales
          como "Los mas elegidos" o secciones de recomendados.
        </p>
        <p>Sirve para empujar productos con mejor margen, promos activas o lanzamientos.</p>
      </section>

      <section className="admin-two-col products-support-grid">
        <article className="admin-card products-step-card">
          <div className="products-section-head">
            <div>
              <p>Importacion</p>
              <h2>Carga de productos por Excel</h2>
            </div>
            <span className="products-section-icon">
              <FileSpreadsheet size={18} />
            </span>
          </div>
          <label className="products-upload-card">
            <div className="products-upload-head">
              <span className="products-upload-icon">
                <Upload size={18} />
              </span>
              <div>
                <strong>Subi un archivo para preparar la carga masiva</strong>
                <small>Compatible con `.xlsx`, `.xls` y `.csv`</small>
              </div>
            </div>
            <span className="products-upload-trigger">Seleccionar archivo</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFileChange} />
          </label>
          <p className="products-helper-copy">
            Alcance actual del prototipo: vista para carga de <b>productos nuevos</b>. No pisa
            productos existentes.
          </p>
          {excelFileName && <p className="products-file-pill">{excelFileName}</p>}
          {excelImportSummary.total > 0 ? (
            <div className="products-import-summary">
              <span>{excelImportSummary.total} filas leidas</span>
              <span>{excelImportSummary.ready} listas</span>
              <span>{excelImportSummary.duplicates} duplicadas</span>
              <span>{excelImportSummary.errors} con error</span>
            </div>
          ) : null}
          <div className="excel-columns-grid products-excel-columns-grid">
            {excelColumns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
          <div className="products-import-actions">
            <button
              type="button"
              onClick={importExcelProducts}
              disabled={importingExcel || saving || loading || !excelImportSummary.ready}
            >
              {importingExcel ? "Importando..." : "Importar productos nuevos"}
            </button>
          </div>
          {excelMessage && <p className="admin-message">{excelMessage}</p>}
        </article>

        <article className="admin-card products-step-card products-step-card--preview">
          <div className="products-section-head">
            <div>
              <p>Estructura sugerida</p>
              <h2>Vista previa del formato</h2>
            </div>
            <span className="products-section-icon">
              <FileSpreadsheet size={18} />
            </span>
          </div>
          <p className="products-helper-copy">
            {excelImportRows.length
              ? "Preview real del archivo cargado, con estado por fila antes de importar."
              : "Usa estas columnas para armar el archivo y acelerar la carga del catalogo."}
          </p>
          <div className="admin-table-wrap products-excel-preview-wrap">
            <table className="admin-table products-excel-preview-table">
              <thead>
                <tr>
                  {excelColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {(excelImportRows.length ? excelImportRows : excelPreviewRows).map((row) => (
                  <tr key={row.sku || `preview-${row.name}`}>
                    <td>{row.sku}</td>
                    <td>{row.name}</td>
                    <td>{row.category}</td>
                    <td>{row.brand}</td>
                    <td>{row.price}</td>
                    <td>{row.transferPrice}</td>
                    <td>{row.stock}</td>
                    <td>{row.image}</td>
                    <td>{row.description}</td>
                    <td>
                      {"status" in row ? (
                        <span className={`products-import-status is-${row.status}`}>
                          {row.status === "ready"
                            ? "Lista"
                            : row.status === "duplicate"
                              ? "Duplicada"
                              : "Error"}
                        </span>
                      ) : (
                        <span className="products-import-status is-sample">Ejemplo</span>
                      )}
                    </td>
                    <td>
                      {"issues" in row && row.issues?.length
                        ? row.issues.join(" ")
                        : "Fila valida para crear productos nuevos."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="admin-card products-table-card">
        <div className="products-section-head">
          <div>
            <p>Catalogo activo</p>
            <h2>Edicion rapida de precios, stock y visibilidad</h2>
          </div>
        </div>
        <div className="admin-toolbar products-toolbar">
          <label className="products-search-shell">
            <Search size={17} />
            <input
              type="search"
              value={query}
              placeholder="Buscar por SKU, nombre, marca o categoria"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="products-toolbar-status">
            {visibleProducts.length} productos visibles de {products.length}
          </p>
          <button type="button" onClick={saveChanges} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table products-catalog-table">
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
                    <div className="table-product products-table-product">
                      <img src={product.image || CATALOG_IMAGE_PLACEHOLDER} alt={product.name} />
                      <div>
                        <b>{product.name}</b>
                        <small>{product.brand}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="products-data-chip">{product.sku}</span>
                  </td>
                  <td>
                    <span className="products-data-chip soft">{product.category}</span>
                  </td>
                  <td>
                    <div className="products-table-field">
                      <label className="products-table-input-shell">
                        <span>$</span>
                        <input
                          type="number"
                          value={product.price}
                          onChange={(event) =>
                            updateField(product.id, "price", Number(event.target.value || 0))
                          }
                        />
                      </label>
                      <small>{formatCurrency(product.price)}</small>
                    </div>
                  </td>
                  <td>
                    <div className="products-table-field">
                      <label className="products-table-input-shell">
                        <span>$</span>
                        <input
                          type="number"
                          value={product.transferPrice || ""}
                          onChange={(event) =>
                            updateField(product.id, "transferPrice", Number(event.target.value || 0))
                          }
                        />
                      </label>
                    </div>
                  </td>
                  <td>
                    <div className="products-table-field">
                      <label className="products-table-input-shell unit">
                        <span>u</span>
                        <input
                          type="number"
                          value={product.stock}
                          onChange={(event) =>
                            updateField(product.id, "stock", Number(event.target.value || 0))
                          }
                        />
                      </label>
                    </div>
                  </td>
                  <td>
                    <label className="switch-inline products-switch-inline" title={product.active ? "Activo" : "Inactivo"}>
                      <input
                        type="checkbox"
                        checked={product.active}
                        onChange={(event) => updateField(product.id, "active", event.target.checked)}
                      />
                    </label>
                  </td>
                  <td>
                    <label className="switch-inline products-switch-inline" title={product.highlighted ? "Destacado" : "No destacado"}>
                      <input
                        type="checkbox"
                        checked={product.highlighted}
                        onChange={(event) =>
                          updateField(product.id, "highlighted", event.target.checked)
                        }
                      />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-two-col products-support-grid products-bottom-grid">
        <article className="admin-card products-step-card">
          <div className="products-section-head">
            <div>
              <p>Alta manual</p>
              <h2>Alta rapida de producto</h2>
            </div>
          </div>
          <p className="products-helper-copy">
            Crea productos en segundos para completar el catalogo y publicarlos directamente.
          </p>
          <p className="products-helper-copy">
            Usa las sugerencias de categoria y marca para mantener el catalogo consistente en toda
            la tienda.
          </p>
          <form
            className="admin-inline-form product-inline-form products-create-form"
            onSubmit={createProduct}
          >
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
              list="catalog-category-options"
              value={draft.category}
              onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Marca"
              list="catalog-brand-options"
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
            <textarea
              placeholder="Descripcion del producto para la ficha individual y contenido comercial"
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <label className="products-switch-inline" style={{ marginTop: "10px", width: "100%", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="checkbox"
                checked={draft.combo}
                onChange={(event) => setDraft((prev) => ({ ...prev, combo: event.target.checked }))}
              />
              <span>Es un combo / promoción</span>
            </label>
            {draft.combo && (
              <input
                type="text"
                placeholder="Etiquetas de Búsqueda (ej: creatina, proteina, whey)"
                value={draft.searchTags}
                onChange={(event) => setDraft((prev) => ({ ...prev, searchTags: event.target.value }))}
                style={{ marginTop: "10px" }}
              />
            )}
            <button type="submit" disabled={saving || loading}>
              {saving ? "Guardando..." : "Crear producto"}
            </button>
          </form>
          <datalist id="catalog-category-options">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <datalist id="catalog-brand-options">
            {brands.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
          {message && <p className="admin-message">{message}</p>}
        </article>

        <article className="admin-card products-step-card">
          <div className="products-section-head">
            <div>
              <p>Activos visuales</p>
              <h2>Subida multiple de imagenes por producto</h2>
            </div>
            <span className="products-section-icon">
              <ImagePlus size={18} />
            </span>
          </div>
          <p className="products-helper-copy">
            Elegi el producto, carga varias imagenes y ordena la galeria antes de guardar.
          </p>
          <div className="gallery-admin-toolbar products-gallery-toolbar">
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
            <label className="products-gallery-upload">
              <Upload size={16} />
              <span>{saving ? "Subiendo..." : "Cargar imagenes"}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryFiles}
                disabled={saving || loading}
              />
            </label>
          </div>
          <label className="products-description-editor">
            <span>Descripcion comercial del producto seleccionado</span>
            <textarea
              rows="4"
              placeholder="Escribe una descripcion clara, breve y orientada a venta."
              value={selectedProduct?.description || ""}
              onChange={(event) =>
                selectedProduct
                  ? updateField(selectedProduct.id, "description", event.target.value)
                  : null
              }
            />
            <small>Esta descripcion ya se usa en la ficha individual del producto.</small>
          </label>
          {selectedProduct && (
            <div className="products-description-editor" style={{ marginTop: "15px" }}>
              <label className="products-switch-inline" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <input
                  type="checkbox"
                  checked={selectedProduct.combo || false}
                  onChange={(event) => updateField(selectedProduct.id, "combo", event.target.checked)}
                />
                <span>Es un combo / promoción</span>
              </label>
              {selectedProduct.combo && (
                <>
                  <span>Etiquetas de Búsqueda para el buscador de la tienda</span>
                  <input
                    type="text"
                    placeholder="Ej: creatina, proteina, whey"
                    value={selectedProduct.searchTags || ""}
                    onChange={(event) => updateField(selectedProduct.id, "searchTags", event.target.value)}
                  />
                  <small>Cuando el cliente busque alguna de estas palabras, aparecerá este combo.</small>
                </>
              )}
            </div>
          )}
          <div className="gallery-url-row products-gallery-url-row">
            <input
              type="url"
              placeholder="O pega una URL de imagen"
              value={galleryUrl}
              onChange={(event) => setGalleryUrl(event.target.value)}
            />
            <button type="button" onClick={addGalleryUrl} disabled={saving || loading}>
              Agregar URL
            </button>
          </div>
          <ul className="gallery-admin-list products-gallery-list">
            {!selectedProduct?.gallery?.length ? (
              <li>
                <img src={selectedProduct?.image || CATALOG_IMAGE_PLACEHOLDER} alt="Placeholder del producto" />
                <div className="products-gallery-copy">
                  <b>Sin imagenes reales cargadas</b>
                  <small>Sube archivos o pega URLs antes de guardar el producto.</small>
                </div>
              </li>
            ) : null}
            {(selectedProduct?.gallery || []).map((image, index) => (
              <li key={`${selectedProduct?.id}-${image}-${index}`}>
                <img src={image} alt={`${selectedProduct?.name} ${index + 1}`} />
                <div className="products-gallery-copy">
                  <b>Imagen {index + 1}</b>
                  <small>{index === 0 ? "Principal" : "Secundaria"}</small>
                </div>
                <div className="products-gallery-actions">
                  <button
                    type="button"
                    title="Mover hacia arriba"
                    aria-label="Mover hacia arriba"
                    disabled={index === 0}
                    onClick={() => moveGalleryImage(index, "left")}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    title="Mover hacia abajo"
                    aria-label="Mover hacia abajo"
                    disabled={index === (selectedProduct?.gallery?.length || 0) - 1}
                    onClick={() => moveGalleryImage(index, "right")}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    title="Quitar imagen"
                    aria-label="Quitar imagen"
                    onClick={() => removeGalleryImage(index)}
                  >
                    <Trash2 size={15} />
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

import { useEffect, useMemo, useState } from "react";
import {
  ImagePlus,
  Search,
  PackagePlus,
  Upload,
} from "lucide-react";
import { useAdminCatalogData } from "../../hooks/useAdminCatalogData";
import { formatCurrency } from "../../utils/currency";
import {
  CATALOG_IMAGE_PLACEHOLDER,
  isCatalogPlaceholderImage,
} from "../../utils/catalogMedia";

function moveItem(array, fromIndex, toIndex) {
  const next = [...array];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function AdminCombosPage() {
  const {
    products,
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
    comboLabel: "", // Guardaremos esto en searchTags para no romper el esquema
    price: "",
    transferPrice: "",
    stock: "",
    description: "",
  });
  const [message, setMessage] = useState("");
  
  const [selectedProductId, setSelectedProductId] = useState("");
  const [galleryUrl, setGalleryUrl] = useState("");
  const [galleryMessage, setGalleryMessage] = useState("");

  // Solo mostrar productos que son combos
  const comboProducts = useMemo(() => {
    return products.filter((p) => p.combo === true);
  }, [products]);

  useEffect(() => {
    if (comboProducts.length > 0 && !comboProducts.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(comboProducts[0]?.id || "");
    }
  }, [comboProducts, selectedProductId]);

  const visibleCombos = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return comboProducts;
    }

    return comboProducts.filter(
      (product) =>
        (product.name || "").toLowerCase().includes(term) ||
        (product.sku || "").toLowerCase().includes(term) ||
        (product.searchTags || "").toLowerCase().includes(term)
    );
  }, [comboProducts, query]);

  const selectedProduct =
    comboProducts.find((product) => product.id === selectedProductId) || comboProducts[0] || null;

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
      setMessage("Combos actualizados y base de datos lista.");
    } catch {
      setMessage("Guardamos los cambios en pantalla, pero no pudimos persistirlos todavia.");
    }
  };

  const createCombo = async (event) => {
    event.preventDefault();
    if (!draft.sku.trim() || !draft.name.trim() || !draft.comboLabel.trim()) {
      setMessage("Completa SKU, Nombre y Etiqueta de combo (ej. 2x1).");
      return;
    }

    const id = `combo_${Date.now()}`;
    const nextSku = draft.sku.trim();
    const nextProducts = [
      {
        id,
        sku: nextSku,
        slug: `${draft.name.toLowerCase().replace(/\s+/g, "-")}-${id}`,
        name: draft.name.trim(),
        brand: "Combo Especial",
        category: "Combos",
        objective: "Combos",
        price: Number(draft.price || 0),
        promoPrice: null,
        transferPrice: Number(draft.transferPrice || draft.price || 0),
        rating: 0,
        reviews: 0,
        stock: Number(draft.stock || 0),
        sold: 0,
        featured: false,
        promo: true, // Forzamos true para que aparezca en promos
        combo: true, // Esto es crítico para identificarlo como combo
        searchTags: draft.comboLabel.trim(), // Guardamos el 2x1 o 3x2 aquí
        active: true,
        highlighted: false,
        image: CATALOG_IMAGE_PLACEHOLDER,
        gallery: [],
        description: draft.description.trim() || "Combo especial armado desde el panel.",
      },
      ...products,
    ];

    setProducts(nextProducts);
    setSelectedProductId(id);
    setDraft({
      sku: "",
      name: "",
      comboLabel: "",
      price: "",
      transferPrice: "",
      stock: "",
      description: "",
    });

    try {
      const saved = await saveProducts(nextProducts);
      const savedProduct = saved.find((product) => product.sku === nextSku);
      setSelectedProductId(savedProduct?.id || saved[0]?.id || id);
      setMessage("Combo creado y guardado correctamente.");
    } catch {
      setMessage("Combo creado en pantalla. Falta persistirlo en la base.");
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
      setGalleryMessage("No pudimos subir las imagenes del combo.");
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
        <p>Promociones y Bundles</p>
        <h1>Gestión de Combos</h1>
        <span>
          Alta exclusiva de combos promocionales (ej. 2x1, 3x2). Asigna imágenes y precios de conjunto fácilmente.
        </span>
        <div className="products-admin-header-meta">
          <span>
            <strong>{comboProducts.length}</strong> combos activos/inactivos
          </span>
          <span>
            <strong>{visibleCombos.length}</strong> visibles en esta vista
          </span>
        </div>
      </header>

      {loading && <section className="admin-demo-note">Cargando catalogo de combos...</section>}
      {!loading && error && <section className="admin-demo-note">{error}</section>}

      <section className="admin-two-col products-support-grid products-bottom-grid">
        <article className="admin-card products-step-card">
          <div className="products-section-head">
            <div>
              <p>Alta manual de combo</p>
              <h2>Crear nuevo combo</h2>
            </div>
            <span className="products-section-icon">
              <PackagePlus size={18} />
            </span>
          </div>
          <p className="products-helper-copy">
            Crea un nuevo combo definiendo su etiqueta (ej. 2x1 o 3x2). Esto lo marcará automáticamente como producto tipo combo.
          </p>
          <form
            className="admin-inline-form product-inline-form products-create-form"
            onSubmit={createCombo}
          >
            <input
              type="text"
              placeholder="SKU"
              value={draft.sku}
              onChange={(event) => setDraft((prev) => ({ ...prev, sku: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Nombre del Combo"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              type="text"
              placeholder="Etiqueta del combo (ej: 2x1, 3x2)"
              value={draft.comboLabel}
              onChange={(event) => setDraft((prev) => ({ ...prev, comboLabel: event.target.value }))}
            />
            <input
              type="number"
              placeholder="Precio Total del Combo"
              value={draft.price}
              onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
            />
            <input
              type="number"
              placeholder="Precio de transferencia"
              value={draft.transferPrice}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, transferPrice: event.target.value }))
              }
            />
            <input
              type="number"
              placeholder="Stock disponible del combo"
              value={draft.stock}
              onChange={(event) => setDraft((prev) => ({ ...prev, stock: event.target.value }))}
            />
            <textarea
              placeholder="Descripción detallada de qué productos incluye este combo"
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <button type="submit" disabled={saving || loading}>
              {saving ? "Guardando..." : "Crear combo"}
            </button>
          </form>
          {message && <p className="admin-message">{message}</p>}
        </article>

        <article className="admin-card products-step-card">
          <div className="products-section-head">
            <div>
              <p>Activos visuales del combo</p>
              <h2>Subida de imágenes</h2>
            </div>
            <span className="products-section-icon">
              <ImagePlus size={18} />
            </span>
          </div>
          <p className="products-helper-copy">
            Elegí un combo existente, cargá la foto que represente al combo entero (ej. los productos juntos).
          </p>
          <div className="gallery-admin-toolbar products-gallery-toolbar">
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
            >
              {comboProducts.length === 0 && <option value="">No hay combos</option>}
              {comboProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.searchTags || "Combo"})
                </option>
              ))}
            </select>
            <label className="products-gallery-upload" style={{ opacity: selectedProduct ? 1 : 0.5, pointerEvents: selectedProduct ? 'auto' : 'none' }}>
              <Upload size={16} />
              <span>{saving ? "Subiendo..." : "Cargar imagenes"}</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleGalleryFiles}
                disabled={saving || !selectedProduct}
              />
            </label>
          </div>
          
          <div className="products-gallery-url" style={{ opacity: selectedProduct ? 1 : 0.5, pointerEvents: selectedProduct ? 'auto' : 'none' }}>
            <input
              type="url"
              placeholder="Pegar URL de imagen..."
              value={galleryUrl}
              onChange={(event) => setGalleryUrl(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addGalleryUrl()}
              disabled={!selectedProduct}
            />
            <button type="button" onClick={addGalleryUrl} disabled={!selectedProduct}>
              Añadir
            </button>
          </div>
          
          <div className="admin-gallery-grid products-gallery-grid">
            {selectedProduct?.gallery?.map((url, index) => (
              <div key={url} className="gallery-item products-gallery-item">
                <img src={url} alt={`Imagen ${index + 1}`} loading="lazy" />
                <div className="gallery-item-actions">
                  <button type="button" onClick={() => moveGalleryImage(index, "left")}>
                    &larr;
                  </button>
                  <button type="button" onClick={() => removeGalleryImage(index)}>
                    &times;
                  </button>
                  <button type="button" onClick={() => moveGalleryImage(index, "right")}>
                    &rarr;
                  </button>
                </div>
              </div>
            ))}
            {!selectedProduct?.gallery?.length && (
              <p className="admin-demo-note inline">Sin imagenes cargadas para este combo.</p>
            )}
          </div>
          {galleryMessage && <p className="admin-message">{galleryMessage}</p>}
        </article>
      </section>

      <section className="admin-card products-table-card">
        <div className="products-section-head">
          <div>
            <p>Combos activos</p>
            <h2>Edición rápida de precios y stock</h2>
          </div>
        </div>
        <div className="admin-toolbar products-toolbar">
          <label className="products-search-shell">
            <Search size={17} />
            <input
              type="search"
              value={query}
              placeholder="Buscar por SKU o nombre..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className="products-toolbar-status">
            {visibleCombos.length} combos visibles de {comboProducts.length}
          </p>
          <button type="button" onClick={saveChanges} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table products-catalog-table">
            <thead>
              <tr>
                <th>Combo</th>
                <th>SKU</th>
                <th>Etiqueta</th>
                <th>Precio</th>
                <th>Transferencia</th>
                <th>Stock</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              {visibleCombos.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="table-product products-table-product">
                      <img src={product.image || CATALOG_IMAGE_PLACEHOLDER} alt={product.name} />
                      <div>
                        <b>{product.name}</b>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="products-data-chip">{product.sku}</span>
                  </td>
                  <td>
                    <span className="products-data-chip soft">{product.searchTags || "Combo"}</span>
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
                </tr>
              ))}
              {visibleCombos.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                    No se encontraron combos creados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminCombosPage;

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ui/ProductCard";
import SectionTitle from "../components/ui/SectionTitle";
import { brands, categories, products } from "../data/products";
import { filterProducts, sortProducts } from "../utils/catalog";

function ProductCardSkeleton() {
  return (
    <article className="product-card compact skeleton-product-card" aria-hidden="true">
      <div className="product-image-wrap skeleton-shimmer">
        <span className="product-tag">Cargando</span>
      </div>
      <div className="product-body">
        <div className="skeleton-line skeleton-title skeleton-shimmer" />
        <div className="skeleton-line skeleton-rating skeleton-shimmer" />
        <div className="skeleton-line skeleton-promo skeleton-shimmer" />
        <div className="skeleton-line skeleton-price skeleton-shimmer" />
        <div className="skeleton-line skeleton-transfer skeleton-shimmer" />
      </div>
    </article>
  );
}

function CatalogPage({ onlyPromos = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    query: searchParams.get("q") || "",
    category: searchParams.get("categoria") || "",
    brand: "",
    minPrice: "",
    maxPrice: "",
    promoOnly: onlyPromos || searchParams.get("promo") === "1",
  }));
  const [sortBy, setSortBy] = useState("mostSold");
  const [isLoading, setIsLoading] = useState(true);
  const skeletonProducts = useMemo(() => Array.from({ length: 10 }, (_, index) => index), []);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      query: searchParams.get("q") || "",
      category: searchParams.get("categoria") || "",
      promoOnly: onlyPromos || searchParams.get("promo") === "1",
    }));
  }, [onlyPromos, searchParams]);

  useEffect(() => {
    setIsLoading(true);
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, 360);

    return () => window.clearTimeout(timeoutId);
  }, [filters, sortBy]);

  const visibleProducts = useMemo(() => {
    const filtered = filterProducts(products, filters);
    return sortProducts(filtered, sortBy);
  }, [filters, sortBy]);

  const onFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      category: "",
      brand: "",
      minPrice: "",
      maxPrice: "",
      promoOnly: onlyPromos,
    });
    setSearchParams(onlyPromos ? { promo: "1" } : {});
  };

  return (
    <div className="catalog-page">
      <section className="catalog-hero">
        <img src="/assets/ref-01.24.54.jpg" alt="Promos y catalogo de Grizzly suplementos" />
        <div className="catalog-hero-overlay" />
        <div className="container">
          <h1>{onlyPromos ? "PROMOS" : "CATALOGO DE PRODUCTOS"}</h1>
        </div>
      </section>

      <section className="container section-space">
        <div className="catalog-topline">
          <SectionTitle
            eyebrow="Tienda"
            title={onlyPromos ? "Todos los productos en promo" : "Todos los suplementos"}
            subtitle={`Mostrando ${visibleProducts.length} resultados`}
          />
          <label className="sort-control">
            Ordenar
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="mostSold">Mas vendidos</option>
              <option value="priceAsc">Menor precio</option>
              <option value="priceDesc">Mayor precio</option>
              <option value="promos">Promociones</option>
            </select>
          </label>
        </div>

        <div className="catalog-layout">
          <aside className="filters-panel">
            <h3>Filtrar</h3>

            <label>
              Buscar
              <input
                type="search"
                value={filters.query}
                onChange={(event) => onFilterChange("query", event.target.value)}
                placeholder="Nombre, marca o categoria"
              />
            </label>

            <label>
              Categoria
              <select
                value={filters.category}
                onChange={(event) => onFilterChange("category", event.target.value)}
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Marca
              <select value={filters.brand} onChange={(event) => onFilterChange("brand", event.target.value)}>
                <option value="">Todas</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </label>

            <div className="price-filter-box">
              <p>Precio</p>
              <div className="price-row">
                <label>
                  Desde
                  <input
                    type="number"
                    min="0"
                    value={filters.minPrice}
                    onChange={(event) => onFilterChange("minPrice", event.target.value)}
                    placeholder="0"
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="number"
                    min="0"
                    value={filters.maxPrice}
                    onChange={(event) => onFilterChange("maxPrice", event.target.value)}
                    placeholder="999999"
                  />
                </label>
              </div>
            </div>

            <label className="inline-check">
              <input
                type="checkbox"
                checked={filters.promoOnly}
                onChange={(event) => onFilterChange("promoOnly", event.target.checked)}
              />
              Solo promociones
            </label>

            <button type="button" className="btn-outline full" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </aside>

          <div className="catalog-results" aria-busy={isLoading}>
            {isLoading ? (
              <div className="product-grid five-col">
                {skeletonProducts.map((index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="empty-box">
                <h3>No encontramos productos con esos filtros</h3>
                <p>Proba quitando filtros o buscando por otra palabra.</p>
              </div>
            ) : (
              <div className="product-grid five-col">
                {visibleProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compact
                    revealIndex={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CatalogPage;

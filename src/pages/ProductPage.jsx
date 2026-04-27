import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BadgeCheck,
  Flame,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCatalogProducts } from "../hooks/useCatalogProducts";
import { formatCurrency } from "../utils/currency";
import { getEffectivePrice } from "../utils/catalog";
import ProductCard from "../components/ui/ProductCard";

function ProductPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const products = useCatalogProducts();
  const product = products.find((item) => item.slug === slug);
  const [mainImage, setMainImage] = useState(product?.gallery?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [postalCode, setPostalCode] = useState("");
  const [shippingMessage, setShippingMessage] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setMainImage(product?.gallery?.[0] || "");
    setQuantity(1);
    setPostalCode("");
    setShippingMessage("");
    setAdded(false);
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) {
      return [];
    }

    return products
      .filter((item) => item.category === product.category && item.id !== product.id)
      .slice(0, 4);
  }, [product]);

  if (!product) {
    return (
      <section className="container section-space empty-box">
        <h2>Producto no encontrado</h2>
        <p>Revisa el catalogo para encontrar el suplemento que estas buscando.</p>
        <Link to="/catalogo" className="btn-primary">
          Ir al catalogo
        </Link>
      </section>
    );
  }

  const effectivePrice = getEffectivePrice(product);
  const viewerCount = 200 + (product.reviews * 7) % 800;
  const galleryCount = product.gallery?.length || 0;
  const stockLabel =
    product.stock > 20 ? "Stock disponible" : product.stock > 8 ? "Ultimas unidades" : "Stock bajo";
  const stockTone = product.stock > 20 ? "ok" : product.stock > 8 ? "warn" : "alert";

  const handleQuantity = (delta) => {
    setQuantity((current) => Math.min(product.stock, Math.max(1, current + delta)));
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

  const calculateShipping = () => {
    if (!postalCode.trim()) {
      setShippingMessage("Ingresa un codigo postal valido.");
      return;
    }

    const numericPostal = Number(postalCode.replace(/\D/g, ""));
    if (!numericPostal) {
      setShippingMessage("Ingresa un codigo postal valido.");
      return;
    }

    const estimated = numericPostal % 2 === 0 ? 3000 : 4500;
    setShippingMessage(`Costo estimado a CP ${postalCode}: ${formatCurrency(estimated)}.`);
  };

  return (
    <div className="product-page container section-space">
      <div className="breadcrumb">
        <Link to="/">Inicio</Link>
        <span>/</span>
        <Link to="/promos">Promos</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      <div className="product-detail">
        <div className="product-gallery-shell">
          <div className="product-gallery">
            <div className="thumb-list">
              {product.gallery.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setMainImage(image)}
                  className={mainImage === image ? "active" : ""}
                  aria-label={`Ver imagen ${index + 1} de ${product.name}`}
                >
                  <img src={image} alt={`${product.name} miniatura`} />
                </button>
              ))}
            </div>

            <div className="main-image">
              {product.promo && <span className="product-hero-tag">Promo activa</span>}
              <img src={mainImage} alt={product.name} />
            </div>
          </div>

          <div className="product-gallery-footer">
            <div>
              <strong>{galleryCount} imagenes del producto</strong>
              <span>Navega la galeria para revisar detalle, pack y variantes visuales.</span>
            </div>
            <div className="product-gallery-bullets">
              <span>
                <ShieldCheck size={15} />
                Producto original
              </span>
              <span>
                <Truck size={15} />
                Envio a todo el pais
              </span>
            </div>
          </div>
        </div>

        <div className="product-info-column">
          <div className="product-info-header">
            <div className="product-info-chips">
              <span>{product.brand}</span>
              <span>{product.category}</span>
              <span className={`stock-state ${stockTone}`}>{stockLabel}</span>
            </div>

            <h1>{product.name}</h1>

            <div className="product-rating-row">
              <div className="product-rating large">
                <BadgeCheck size={16} />
                <span>{product.rating} de 5</span>
                <small>({product.reviews} opiniones)</small>
              </div>
              <p className="product-short">{product.description}</p>
            </div>
          </div>

          <div className="product-purchase-card">
            <div className="detail-pricing">
              {product.promo && <small className="discount-label">Promo activa</small>}
              <div className="detail-price-main">
                <strong>{formatCurrency(effectivePrice)}</strong>
                {product.promoPrice && <small>{formatCurrency(product.price)}</small>}
              </div>
              <span>{formatCurrency(product.transferPrice)} con transferencia</span>
              <p className="delivery-note">
                <Truck size={16} />
                Envio gratis superando los $120.000
              </p>
            </div>

            <div className="quantity-block">
              <label>Cantidad</label>
              <div className="quantity-row">
                <button type="button" onClick={() => handleQuantity(-1)}>
                  -
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => handleQuantity(1)}>
                  +
                </button>
              </div>
            </div>

            <button type="button" className="btn-primary full product-cta" onClick={handleAddToCart}>
              AGREGAR AL CARRITO
            </button>
            {added && <p className="feedback-ok">Producto agregado al carrito.</p>}

            <div className="shipping-calculator">
              <label>
                <Truck size={16} />
                Calcula tu envio
              </label>
              <div>
                <input
                  type="text"
                  placeholder="Tu codigo postal"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                />
                <button type="button" onClick={calculateShipping}>
                  CALCULAR
                </button>
              </div>
              {shippingMessage && <p>{shippingMessage}</p>}
            </div>

            <div className="product-trust-strip">
              <span>
                <PackageCheck size={16} />
                Compra segura
              </span>
              <span>
                <ShieldCheck size={16} />
                Producto original
              </span>
            </div>

            <p className="viewers">
              <Flame size={16} />
              {viewerCount} personas vieron este producto recientemente.
            </p>
          </div>
        </div>
      </div>

      <section className="section-space">
        <div className="section-title">
          <p>Complementa tu compra</p>
          <h2 className="related-title">Productos relacionados</h2>
          <span>Mas opciones dentro de la misma categoria para comparar o sumar al pedido.</span>
        </div>
        <div className="product-grid four-col">
          {relatedProducts.map((item, index) => (
            <ProductCard key={item.id} product={item} compact revealIndex={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProductPage;

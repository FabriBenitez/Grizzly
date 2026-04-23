import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Truck } from "lucide-react";
import { products } from "../data/products";
import { useCart } from "../context/CartContext";
import { formatCurrency } from "../utils/currency";
import { getDiscountPercent, getEffectivePrice } from "../utils/catalog";
import ProductCard from "../components/ui/ProductCard";

function ProductPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const product = products.find((item) => item.slug === slug);
  const [mainImage, setMainImage] = useState(product?.gallery?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [postalCode, setPostalCode] = useState("");
  const [shippingMessage, setShippingMessage] = useState("");
  const [added, setAdded] = useState(false);

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
        <p>Revisá el catálogo para encontrar el suplemento que estás buscando.</p>
        <Link to="/catalogo" className="btn-primary">
          Ir al catálogo
        </Link>
      </section>
    );
  }

  const effectivePrice = getEffectivePrice(product);
  const discount = getDiscountPercent(product);
  const viewerCount = 200 + (product.reviews * 7) % 800;

  const handleQuantity = (delta) => {
    setQuantity((current) => Math.min(product.stock, Math.max(1, current + delta)));
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const calculateShipping = () => {
    if (!postalCode.trim()) {
      setShippingMessage("Ingresá un código postal válido.");
      return;
    }

    const numericPostal = Number(postalCode.replace(/\D/g, ""));
    if (!numericPostal) {
      setShippingMessage("Ingresá un código postal válido.");
      return;
    }

    const estimated = numericPostal % 2 === 0 ? 3000 : 4500;
    setShippingMessage(`Costo estimado a CP ${postalCode}: ${formatCurrency(estimated)}.`);
  };

  return (
    <div className="product-page container section-space">
      <div className="breadcrumb">
        <Link to="/">Inicio</Link>
        <span>•</span>
        <Link to="/promos">Promos</Link>
        <span>•</span>
        <span>{product.name}</span>
      </div>

      <div className="product-detail">
        <div className="product-gallery">
          <div className="thumb-list">
            {product.gallery.map((image) => (
              <button
                key={image}
                type="button"
                onClick={() => setMainImage(image)}
                className={mainImage === image ? "active" : ""}
              >
                <img src={image} alt={`${product.name} miniatura`} />
              </button>
            ))}
          </div>
          <div className="main-image">
            <img src={mainImage} alt={product.name} />
          </div>
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>
          <p className="product-short">{product.description}</p>
          <small className="discount-label">-{discount}% OFF</small>
          <div className="detail-pricing">
            <strong>{formatCurrency(effectivePrice)}</strong>
            <small>{formatCurrency(product.price)}</small>
            <span>{formatCurrency(product.transferPrice)} con transferencia</span>
            <p>3 x {formatCurrency(Math.round(effectivePrice / 3))} sin interés</p>
            <p className="delivery-note">Envío gratis superando los $120.000</p>
          </div>

          <div className="quantity-row">
            <button type="button" onClick={() => handleQuantity(-1)}>
              -
            </button>
            <span>{quantity}</span>
            <button type="button" onClick={() => handleQuantity(1)}>
              +
            </button>
          </div>

          <button type="button" className="btn-primary full" onClick={handleAddToCart}>
            AGREGAR AL CARRITO
          </button>
          {added && <p className="feedback-ok">Producto agregado al carrito.</p>}

          <div className="shipping-calculator">
            <label>
              <Truck size={16} />
              Medios de envío
            </label>
            <div>
              <input
                type="text"
                placeholder="Tu código postal"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
              />
              <button type="button" onClick={calculateShipping}>
                CALCULAR
              </button>
            </div>
            {shippingMessage && <p>{shippingMessage}</p>}
          </div>

          <p className="viewers">🔥 {viewerCount} personas vieron este producto recientemente.</p>
        </div>
      </div>

      <section className="section-space">
        <h2 className="related-title">Productos relacionados</h2>
        <div className="product-grid four-col">
          {relatedProducts.map((item) => (
            <ProductCard key={item.id} product={item} compact />
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProductPage;

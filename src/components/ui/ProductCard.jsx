import { Link } from "react-router-dom";
import { ShoppingBag, Star } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { formatCurrency } from "../../utils/currency";
import { getDiscountPercent, getEffectivePrice } from "../../utils/catalog";

function ProductCard({ product, compact = false }) {
  const { addToCart } = useCart();
  const discount = getDiscountPercent(product);
  const effectivePrice = getEffectivePrice(product);

  return (
    <article className={`product-card ${compact ? "compact" : ""}`}>
      <Link to={`/producto/${product.slug}`} className="product-image-wrap">
        {product.promo && <span className="product-tag">EN PROMO</span>}
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-body">
        <Link to={`/producto/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        <div className="product-rating">
          <Star size={14} fill="currentColor" />
          <span>{product.rating}</span>
          <small>({product.reviews})</small>
        </div>
        {discount > 0 && <small className="discount-label">-{discount}% OFF</small>}
        <div className="product-pricing">
          {product.promoPrice && <small>{formatCurrency(product.price)}</small>}
          <strong>{formatCurrency(effectivePrice)}</strong>
          <span>{formatCurrency(product.transferPrice)} con transferencia</span>
        </div>
        <button type="button" onClick={() => addToCart(product, 1)} className="buy-button">
          COMPRAR <ShoppingBag size={14} />
        </button>
      </div>
    </article>
  );
}

export default ProductCard;

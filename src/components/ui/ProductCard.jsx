import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { getEffectivePrice } from "../../utils/catalog";

function ProductCard({ product, compact = false, revealIndex = 0 }) {
  const effectivePrice = getEffectivePrice(product);
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = cardRef.current;

    if (!node || typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <article
      ref={cardRef}
      className={`product-card ${compact ? "compact" : ""} ${isVisible ? "is-visible" : "is-hidden"}`}
      style={{ "--reveal-delay": `${Math.min(revealIndex, 7) * 70}ms` }}
    >
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
        {product.promo && <small className="discount-label">Promo activa</small>}
        <div className="product-pricing">
          {product.promoPrice && <small>{formatCurrency(product.price)}</small>}
          <strong>{formatCurrency(effectivePrice)}</strong>
          <span>{formatCurrency(product.transferPrice)} con transferencia</span>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;

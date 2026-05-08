import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import { getEffectivePrice } from "../../utils/catalog";
import type { ProductoCatalogo } from "../../tipos/catalogo";
import estilos from "./ProductCard.module.scss";

interface ProductCardProps {
  product: ProductoCatalogo;
  compact?: boolean;
  revealIndex?: number;
}

function ProductCard({ product, compact = false, revealIndex = 0 }: ProductCardProps) {
  const precioEfectivo = getEffectivePrice(product);
  const tarjetaRef = useRef<HTMLElement | null>(null);
  const [esVisible, setEsVisible] = useState(false);

  useEffect(() => {
    const nodo = tarjetaRef.current;

    if (!nodo || typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setEsVisible(true);
      return undefined;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            setEsVisible(true);
            observador.unobserve(entrada.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    observador.observe(nodo);

    return () => observador.disconnect();
  }, []);

  const clases = [
    estilos["tarjeta-producto"],
    compact ? estilos["tarjeta-producto--compacta"] : "",
    esVisible ? estilos["tarjeta-producto--visible"] : estilos["tarjeta-producto--oculta"],
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      ref={tarjetaRef}
      className={clases}
      style={{ animationDelay: `${Math.min(revealIndex, 7) * 70}ms` } as CSSProperties}
      itemScope
      itemType="https://schema.org/Product"
    >
      <Link
        to={`/producto/${product.slug}`}
        className={estilos["tarjeta-producto__enlace-imagen"]}
        itemProp="url"
      >
        {product.promo ? <span className={estilos["tarjeta-producto__etiqueta"]}>En promo</span> : null}
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className={estilos["tarjeta-producto__imagen"]}
          itemProp="image"
        />
      </Link>

      <div className={estilos["tarjeta-producto__cuerpo"]}>
        <Link
          to={`/producto/${product.slug}`}
          className={estilos["tarjeta-producto__nombre"]}
          itemProp="name"
        >
          {product.name}
        </Link>

        <div className={estilos["tarjeta-producto__valoracion"]} aria-label={`Valoración ${product.rating} de 5`}>
          <Star size={14} fill="currentColor" />
          <span>{product.rating}</span>
          <small>({product.reviews})</small>
        </div>

        {product.promo ? (
          <small className={estilos["tarjeta-producto__aviso-promocion"]}>Promoción activa</small>
        ) : null}

        <div
          className={estilos["tarjeta-producto__precios"]}
          itemProp="offers"
          itemScope
          itemType="https://schema.org/Offer"
        >
          <meta itemProp="priceCurrency" content="ARS" />
          <meta itemProp="availability" content={product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"} />
          {product.promoPrice ? (
            <small className={estilos["tarjeta-producto__precio-base"]}>
              {formatCurrency(product.price)}
            </small>
          ) : null}
          <strong className={estilos["tarjeta-producto__precio-final"]} itemProp="price">
            {formatCurrency(precioEfectivo)}
          </strong>
          <span className={estilos["tarjeta-producto__precio-transferencia"]}>
            {formatCurrency(product.transferPrice)} con transferencia
          </span>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;

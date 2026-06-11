import React, { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import estilos from "./ProductCarousel.module.scss";

interface ProductCarouselProps {
  children: React.ReactNode;
  autoPlayInterval?: number;
}

export default function ProductCarousel({ children, autoPlayInterval = 4000 }: ProductCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!autoPlayInterval || isHovered) return;

    const interval = setInterval(() => {
      if (containerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
        const itemWidth = 300; // 280px + 20px gap
        
        // Si llegamos casi al final, volver al inicio
        if (scrollLeft + clientWidth >= scrollWidth - 20) {
          containerRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Scrollear al siguiente item
          containerRef.current.scrollBy({ left: itemWidth, behavior: "smooth" });
        }
      }
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlayInterval, isHovered]);

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const itemWidth = 300;
      containerRef.current.scrollBy({
        left: direction === "left" ? -itemWidth : itemWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <div 
      className={estilos.carouselWrapper}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <button 
        type="button" 
        className={`${estilos.navButton} ${estilos.prevButton}`} 
        onClick={() => scroll("left")}
        aria-label="Anterior"
      >
        <ChevronLeft size={24} />
      </button>
      
      <div className={estilos.carouselContainer} ref={containerRef}>
        {children}
      </div>

      <button 
        type="button" 
        className={`${estilos.navButton} ${estilos.nextButton}`} 
        onClick={() => scroll("right")}
        aria-label="Siguiente"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}

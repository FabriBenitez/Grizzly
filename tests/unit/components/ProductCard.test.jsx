/**
 * @vitest-environment jsdom
 */

import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import ProductCard from "../../../src/components/ui/ProductCard";

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = IntersectionObserverMock;

describe("ProductCard", () => {
  afterEach(() => {
    cleanup();
  });
  const baseProduct = {
    id: "1",
    slug: "producto-test",
    name: "Producto Test",
    image: "test.jpg",
    price: 10000,
    promoPrice: null,
    stock: 10,
    rating: 4.5,
    reviews: 10,
    category: "Test",
    brand: "Grizzly",
    isFeatured: false,
    isActive: true,
    promo: false,
  };

  it("renderiza el precio normal correctamente", () => {
    render(
      <MemoryRouter>
        <ProductCard product={baseProduct} />
      </MemoryRouter>
    );

    // Debe mostrar el precio final
    expect(screen.getByText((c) => c.includes("10.000"))).toBeDefined();
    // No debe mostrar aviso de promocion
    expect(screen.queryByText("En promo")).toBeNull();
  });

  it("renderiza el precio promocional cuando existe", () => {
    const promoProduct = {
      ...baseProduct,
      promoPrice: 8500,
      promo: true,
    };

    render(
      <MemoryRouter>
        <ProductCard product={promoProduct} />
      </MemoryRouter>
    );

    // Debe mostrar la etiqueta
    expect(screen.getByText("En promo")).toBeDefined();
    // Debe mostrar el precio tachado
    expect(screen.getByText((c) => c.includes("10.000"))).toBeDefined();
    // Debe mostrar el precio final
    expect(screen.getByText((c) => c.includes("8.500"))).toBeDefined();
  });

  it("renderiza el estado 'Sin stock' cuando el stock es 0", () => {
    const outOfStockProduct = {
      ...baseProduct,
      stock: 0,
    };

    render(
      <MemoryRouter>
        <ProductCard product={outOfStockProduct} />
      </MemoryRouter>
    );

    expect(screen.getByText("Sin stock")).toBeDefined();
  });

  it("renderiza 'Ultimas unidades' cuando el stock es bajo (1 a 5)", () => {
    const lowStockProduct = {
      ...baseProduct,
      stock: 3,
    };

    render(
      <MemoryRouter>
        <ProductCard product={lowStockProduct} />
      </MemoryRouter>
    );

    expect(screen.getByText("Ultimas unidades")).toBeDefined();
  });
});

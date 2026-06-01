/**
 * @vitest-environment jsdom
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { CartProvider, useCart } from "../../../src/context/CartContext";

const MOCK_PRODUCT_A = {
  id: "prod_1",
  slug: "proteina",
  name: "Proteina Whey",
  image: "img.jpg",
  price: 20000,
  promoPrice: 18000, // Effective price 18000
  stock: 5,
};

const MOCK_PRODUCT_B = {
  id: "prod_2",
  slug: "creatina",
  name: "Creatina",
  image: "img2.jpg",
  price: 15000,
  promoPrice: null, // Effective price 15000
  stock: 2,
};

describe("CartContext", () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test para aislar el estado
    window.localStorage.clear();
  });

  it("debe agregar un producto correctamente", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart(MOCK_PRODUCT_A, 2);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe(MOCK_PRODUCT_A.id);
    expect(result.current.items[0].quantity).toBe(2);
  });

  it("no debe exceder el stock disponible al agregar un producto varias veces", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart(MOCK_PRODUCT_A, 4);
    });
    
    // El stock es 5, intentamos agregar 3 mas (total 7), debe limitarse a 5.
    act(() => {
      result.current.addToCart(MOCK_PRODUCT_A, 3);
    });

    expect(result.current.items[0].quantity).toBe(5);
  });

  it("no debe permitir agregar productos sin stock o con cantidad invalida", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart({ ...MOCK_PRODUCT_B, stock: 0 }, 1);
      result.current.addToCart(MOCK_PRODUCT_A, 0);
      result.current.addToCart(MOCK_PRODUCT_A, -2);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it("debe actualizar la cantidad respetando el stock y los limites minimos", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart(MOCK_PRODUCT_B, 1);
    });

    // Intentamos subir a 5, el maximo es 2
    act(() => {
      result.current.updateQuantity(MOCK_PRODUCT_B.id, 5);
    });
    expect(result.current.items[0].quantity).toBe(2);

    // Intentamos bajar a -1, el minimo de updateQuantity es 1 (para eliminar hay que usar removeItem o cantidad 0 si lo soportara, pero updateQuantity usa Math.max(parsed, 1))
    act(() => {
      result.current.updateQuantity(MOCK_PRODUCT_B.id, -1);
    });
    expect(result.current.items[0].quantity).toBe(1);
  });

  it("debe calcular correctamente el resumen del carrito (totales y descuentos)", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart(MOCK_PRODUCT_A, 2); // 2 x 20000 = 40000 base. 2 x 18000 = 36000 efectivo.
      result.current.addToCart(MOCK_PRODUCT_B, 1); // 1 x 15000 = 15000 base. 1 x 15000 = 15000 efectivo.
    });

    const summary = result.current.summary;
    
    // Subtotal base: 40000 + 15000 = 55000
    expect(summary.subtotal).toBe(55000);
    
    // Total efectivo: 36000 + 15000 = 51000
    expect(summary.total).toBe(51000);
    
    // Descuento: 55000 - 51000 = 4000
    expect(summary.discount).toBe(4000);
    
    // Cantidad de items: 2 + 1 = 3
    expect(summary.count).toBe(3);
  });

  it("debe eliminar un producto y vaciar el carrito", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.addToCart(MOCK_PRODUCT_A, 1);
      result.current.addToCart(MOCK_PRODUCT_B, 1);
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.removeItem(MOCK_PRODUCT_A.id);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe(MOCK_PRODUCT_B.id);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
  });
});

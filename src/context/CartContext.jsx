import { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { getEffectivePrice } from "../utils/catalog";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useLocalStorage("grizzly_cart", []);

  const addToCart = (product, quantity = 1) => {
    if (quantity <= 0) {
      return;
    }

    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
            : item,
        );
      }

      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          image: product.image,
          price: product.price,
          promoPrice: product.promoPrice,
          stock: product.stock,
          quantity: Math.min(quantity, product.stock),
        },
      ];
    });
  };

  const updateQuantity = (productId, quantity) => {
    const parsed = Number(quantity);
    if (!Number.isFinite(parsed)) {
      return;
    }

    setItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          return { ...item, quantity: Math.min(Math.max(parsed, 1), item.stock) };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => setItems([]);

  const summary = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const total = items.reduce((acc, item) => acc + getEffectivePrice(item) * item.quantity, 0);
    const discount = subtotal - total;
    const shipping = total >= 120000 || total === 0 ? 0 : 3000;
    const grandTotal = total + shipping;
    const count = items.reduce((acc, item) => acc + item.quantity, 0);

    return {
      subtotal,
      discount,
      total,
      shipping,
      grandTotal,
      count,
    };
  }, [items]);

  const value = {
    items,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    summary,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return context;
}

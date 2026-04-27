import { useEffect, useState } from "react";
import {
  CATALOG_PRODUCTS_EVENT,
  CATALOG_PRODUCTS_STORAGE_KEY,
  readCatalogProducts,
} from "../utils/catalogStore";

export function useCatalogProducts() {
  const [products, setProducts] = useState(() => readCatalogProducts());

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncProducts = () => {
      setProducts(readCatalogProducts());
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === CATALOG_PRODUCTS_STORAGE_KEY) {
        syncProducts();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CATALOG_PRODUCTS_EVENT, syncProducts);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CATALOG_PRODUCTS_EVENT, syncProducts);
    };
  }, []);

  return products;
}

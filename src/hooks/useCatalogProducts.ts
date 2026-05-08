import { useEffect, useState } from "react";
import {
  CATALOG_PRODUCTS_EVENT,
  CATALOG_PRODUCTS_STORAGE_KEY,
  readCatalogProducts,
} from "../utils/catalogStore";
import type { ProductoCatalogo } from "../tipos/catalogo";

export function useCatalogProducts() {
  const [productos, setProductos] = useState<ProductoCatalogo[]>(() => {
    return readCatalogProducts() as ProductoCatalogo[];
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const sincronizarProductos = () => {
      setProductos(readCatalogProducts() as ProductoCatalogo[]);
    };

    const manejarStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CATALOG_PRODUCTS_STORAGE_KEY) {
        sincronizarProductos();
      }
    };

    window.addEventListener("storage", manejarStorage);
    window.addEventListener(CATALOG_PRODUCTS_EVENT, sincronizarProductos);

    return () => {
      window.removeEventListener("storage", manejarStorage);
      window.removeEventListener(CATALOG_PRODUCTS_EVENT, sincronizarProductos);
    };
  }, []);

  return productos;
}

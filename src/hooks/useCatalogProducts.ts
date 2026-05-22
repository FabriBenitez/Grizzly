import { useEffect, useState } from "react";
import {
  CATALOG_PRODUCTS_EVENT,
  CATALOG_PRODUCTS_STORAGE_KEY,
  readCatalogProducts,
} from "../utils/catalogStore";
import { fetchCatalogFromSupabase } from "../utils/catalog.remote";
import type { ProductoCatalogo } from "../tipos/catalogo";

export function useCatalogProducts() {
  const [productos, setProductos] = useState<ProductoCatalogo[]>(() => {
    return readCatalogProducts() as ProductoCatalogo[];
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let activo = true;

    const sincronizarProductos = () => {
      setProductos(readCatalogProducts() as ProductoCatalogo[]);
    };

    const sincronizarCatalogoRemoto = async () => {
      try {
        const remoteProducts = (await fetchCatalogFromSupabase()) as ProductoCatalogo[];
        if (activo) {
          setProductos(remoteProducts);
        }
      } catch {
        // Si Supabase no esta disponible o falla la carga, conservamos el fallback local/cacheado.
      }
    };

    const manejarStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CATALOG_PRODUCTS_STORAGE_KEY) {
        sincronizarProductos();
      }
    };

    window.addEventListener("storage", manejarStorage);
    window.addEventListener(CATALOG_PRODUCTS_EVENT, sincronizarProductos);
    sincronizarCatalogoRemoto();

    return () => {
      activo = false;
      window.removeEventListener("storage", manejarStorage);
      window.removeEventListener(CATALOG_PRODUCTS_EVENT, sincronizarProductos);
    };
  }, []);

  return productos;
}

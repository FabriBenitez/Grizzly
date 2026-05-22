import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthSupabase } from "../shared/auth/AuthSupabaseProvider";
import {
  getCatalogBrands,
  getCatalogCategories,
  saveCatalogProducts,
} from "../utils/catalogStore";
import {
  fetchAdminCatalogFromSupabase,
  fetchCatalogBrandsFromSupabase,
  fetchCatalogCategoriesFromSupabase,
  readLocalAdminCatalog,
  saveAdminCatalogProducts,
  uploadCatalogImages,
} from "../utils/catalog.remote";

function loadLocalCatalog() {
  const products = readLocalAdminCatalog();
  return {
    products,
    categories: getCatalogCategories(products),
    brands: getCatalogBrands(products),
    useDemoData: true,
  };
}

export function useAdminCatalogData() {
  const { cargando, esAdmin, puedeIniciarSesion } = useAuthSupabase();
  const [products, setProducts] = useState(() => readLocalAdminCatalog());
  const [categories, setCategories] = useState(() => getCatalogCategories(readLocalAdminCatalog()));
  const [brands, setBrands] = useState(() => getCatalogBrands(readLocalAdminCatalog()));
  const [useDemoData, setUseDemoData] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    if (cargando) {
      return;
    }

    if (!puedeIniciarSesion || !esAdmin) {
      const local = loadLocalCatalog();
      setProducts(local.products);
      setCategories(local.categories);
      setBrands(local.brands);
      setUseDemoData(local.useDemoData);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);

    try {
      const [remoteProducts, remoteCategories, remoteBrands] = await Promise.all([
        fetchAdminCatalogFromSupabase(),
        fetchCatalogCategoriesFromSupabase(),
        fetchCatalogBrandsFromSupabase(),
      ]);

      if (remoteProducts.length) {
        setProducts(remoteProducts);
        setUseDemoData(false);
      } else {
        const local = loadLocalCatalog();
        setProducts(local.products);
        setUseDemoData(local.useDemoData);
      }

      setCategories(
        remoteCategories.length
          ? remoteCategories.map((category) => category.name)
          : getCatalogCategories(remoteProducts),
      );
      setBrands(
        remoteBrands.length ? remoteBrands.map((brand) => brand.name) : getCatalogBrands(remoteProducts),
      );

      setError("");
    } catch (loadError) {
      const local = loadLocalCatalog();
      setProducts(local.products);
      setCategories(local.categories);
      setBrands(local.brands);
      setUseDemoData(local.useDemoData);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar el catalogo real. Mostrando fallback local.",
      );
    } finally {
      setLoading(false);
    }
  }, [cargando, esAdmin, puedeIniciarSesion]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const saveProducts = useCallback(
    async (nextProducts) => {
      const safeProducts = Array.isArray(nextProducts) ? nextProducts : [];

      if (!puedeIniciarSesion || !esAdmin) {
        saveCatalogProducts(safeProducts);
        setProducts(safeProducts);
        setUseDemoData(true);
        return safeProducts;
      }

      setSaving(true);

      try {
        const saved = await saveAdminCatalogProducts(safeProducts);
        setProducts(saved);
        setCategories(getCatalogCategories(saved));
        setBrands(getCatalogBrands(saved));
        setUseDemoData(false);
        setError("");
        return saved;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "No pudimos guardar el catalogo en la base.",
        );
        throw saveError;
      } finally {
        setSaving(false);
      }
    },
    [esAdmin, puedeIniciarSesion],
  );

  const uploadImages = useCallback(
    async (files, productName) => {
      const safeFiles = Array.isArray(files) ? files : [];

      if (!safeFiles.length) {
        return [];
      }

      if (!puedeIniciarSesion || !esAdmin) {
        return safeFiles.map((file) => URL.createObjectURL(file));
      }

      try {
        setSaving(true);
        const urls = await uploadCatalogImages(safeFiles, productName);
        setError("");
        return urls;
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "No pudimos subir las imagenes del producto.",
        );
        throw uploadError;
      } finally {
        setSaving(false);
      }
    },
    [esAdmin, puedeIniciarSesion],
  );

  return useMemo(
    () => ({
      products,
      categories,
      brands,
      setProducts,
      useDemoData,
      loading,
      saving,
      error,
      reload: loadProducts,
      saveProducts,
      uploadImages,
    }),
    [
      brands,
      categories,
      error,
      loadProducts,
      loading,
      products,
      saveProducts,
      saving,
      uploadImages,
      useDemoData,
    ],
  );
}

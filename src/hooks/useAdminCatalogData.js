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
  saveAdminCatalogProducts,
  uploadCatalogImages,
} from "../utils/catalog.remote";


export function useAdminCatalogData() {
  const { cargando, esAdmin, puedeIniciarSesion } = useAuthSupabase();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    if (cargando) {
      return;
    }

    if (!puedeIniciarSesion || !esAdmin) {
      setProducts([]);
      setCategories([]);
      setBrands([]);
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

      setProducts(remoteProducts);

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
      setProducts([]);
      setCategories([]);
      setBrands([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar el catalogo.",
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
        return safeProducts;
      }

      setSaving(true);

      try {
        const saved = await saveAdminCatalogProducts(safeProducts);
        setProducts(saved);
        setCategories(getCatalogCategories(saved));
        setBrands(getCatalogBrands(saved));
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
      useDemoData: false,
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
    ],
  );
}

export const BUCKETS_STORAGE = {
  productos: "products",
  hero: "hero",
  marcas: "brands",
} as const;

export function construirRutaPublicaBucket(nombreBucket: string, rutaArchivo: string) {
  return `${nombreBucket}/${rutaArchivo}`.replace(/\/+/g, "/");
}

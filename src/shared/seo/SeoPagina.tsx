import { useEffect } from "react";
import { obtenerSiteUrlPublica } from "../../lib/env.publico";

interface SeoPaginaProps {
  titulo: string;
  descripcion: string;
  rutaCanonical?: string;
}

function asegurarMeta(selector: string, atributo: "name" | "property", valor: string) {
  let elemento = document.head.querySelector<HTMLMetaElement>(selector);

  if (!elemento) {
    elemento = document.createElement("meta");
    elemento.setAttribute(atributo, valor);
    document.head.appendChild(elemento);
  }

  return elemento;
}

function asegurarLinkCanonical() {
  let elemento = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!elemento) {
    elemento = document.createElement("link");
    elemento.setAttribute("rel", "canonical");
    document.head.appendChild(elemento);
  }

  return elemento;
}

function construirUrlCanonica(rutaCanonical?: string) {
  const siteUrl = obtenerSiteUrlPublica();
  const currentPath =
    rutaCanonical || `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (!siteUrl) {
    return currentPath;
  }

  return `${siteUrl}${currentPath.startsWith("/") ? currentPath : `/${currentPath}`}`;
}

function SeoPagina({ titulo, descripcion, rutaCanonical }: SeoPaginaProps) {
  useEffect(() => {
    document.title = titulo;
    const canonicalUrl = construirUrlCanonica(rutaCanonical);

    const metaDescripcion = asegurarMeta('meta[name="description"]', "name", "description");
    metaDescripcion.content = descripcion;

    const ogTitulo = asegurarMeta('meta[property="og:title"]', "property", "og:title");
    ogTitulo.content = titulo;

    const ogDescripcion = asegurarMeta(
      'meta[property="og:description"]',
      "property",
      "og:description",
    );
    ogDescripcion.content = descripcion;

    const ogUrl = asegurarMeta('meta[property="og:url"]', "property", "og:url");
    ogUrl.content = canonicalUrl;

    const canonical = asegurarLinkCanonical();
    canonical.href = canonicalUrl;
  }, [descripcion, rutaCanonical, titulo]);

  return null;
}

export default SeoPagina;

import { useEffect } from "react";

interface SeoPaginaProps {
  titulo: string;
  descripcion: string;
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

function SeoPagina({ titulo, descripcion }: SeoPaginaProps) {
  useEffect(() => {
    document.title = titulo;

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
  }, [descripcion, titulo]);

  return null;
}

export default SeoPagina;

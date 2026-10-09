import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import { Landing } from "./Landing";
import { datosEstructurados } from "./contenido";

// Usado solo al compilar (scripts/prerender.mjs): HTML y estilos de la página pública.
export function render() {
  const hoja = new ServerStyleSheet();
  try {
    const html = renderToString(hoja.collectStyles(<Landing />));
    return { html, estilos: hoja.getStyleTags(), jsonLd: datosEstructurados() };
  } finally {
    hoja.seal();
  }
}

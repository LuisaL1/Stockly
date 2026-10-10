import { renderToString } from "react-dom/server";
import { ServerStyleSheet, ThemeProvider } from "styled-components";
import { StaticRouter } from "react-router-dom";
import { Landing } from "./Landing";
import { datosEstructurados } from "./contenido";
import { Privacidad, Terminos } from "../pages/Legal";
import { Light } from "../styles/themes";

// Usado solo al compilar (scripts/prerender.mjs): HTML y estilos de las páginas públicas.
function renderizar(elemento) {
  const hoja = new ServerStyleSheet();
  try {
    const html = renderToString(hoja.collectStyles(elemento));
    return { html, estilos: hoja.getStyleTags() };
  } finally {
    hoja.seal();
  }
}

export function render() {
  return { ...renderizar(<Landing />), jsonLd: datosEstructurados() };
}

// Páginas legales: cada una con su propio título, descripción y canonical.
export const LEGALES = [
  {
    ruta: "terminos",
    titulo: "Términos y condiciones | Stockly",
    descripcion: "Términos y condiciones del servicio Stockly, software de inventario, ventas y facturación de MCCore (Colombia): planes, pagos, prueba gratis, retracto y uso de datos.",
    componente: Terminos,
  },
  {
    ruta: "privacidad",
    titulo: "Política de tratamiento de datos personales | Stockly",
    descripcion: "Cómo Stockly y MCCore tratan los datos personales de quienes usan la aplicación: qué datos se recogen, para qué, con quién se comparten y cómo ejercer tus derechos (Ley 1581 de 2012).",
    componente: Privacidad,
  },
];

export function renderLegales() {
  return LEGALES.map(({ ruta, titulo, descripcion, componente: Pagina }) => ({
    ruta,
    titulo,
    descripcion,
    ...renderizar(
      <ThemeProvider theme={Light}>
        <StaticRouter location={`/${ruta}`}>
          <Pagina />
        </StaticRouter>
      </ThemeProvider>
    ),
  }));
}

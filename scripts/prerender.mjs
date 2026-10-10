// Prerenderiza las páginas públicas de Stockly para que Google las lea sin ejecutar JavaScript:
// la portada en dist/index.html y las páginas legales en dist/<ruta>/index.html, cada una con sus
// propios metadatos. Se ejecuta después de "vite build" y "vite build --ssr".
import { readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const archivo = join(raiz, "dist", "index.html");
const { render, renderLegales } = await import(pathToFileURL(join(raiz, "dist-ssr", "entry-server.js")).href);
const plantilla = readFileSync(archivo, "utf8");
if (!plantilla.includes('<div id="root"></div>')) throw new Error('No se encontró <div id="root"></div> en dist/index.html');
const escapar = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Portada
const { html, estilos, jsonLd } = render();
const ld = jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`).join("\n    ");
writeFileSync(archivo, plantilla.replace("</head>", `    ${estilos}\n    ${ld}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${html}</div>`));
console.log("Página pública prerenderizada en dist/index.html");

// Páginas legales: mismos scripts y estilos base, pero título, descripción, canonical y OG propios.
for (const p of renderLegales()) {
  const url = `https://appstockly.com/${p.ruta}`;
  let pagina = plantilla
    .replace(/<title>[^<]*<\/title>/, `<title>${escapar(p.titulo)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapar(p.descripcion)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapar(p.titulo)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapar(p.titulo)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapar(p.descripcion)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapar(p.descripcion)}" />`)
    .replace("</head>", `    ${p.estilos}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${p.html}</div>`);
  mkdirSync(join(raiz, "dist", p.ruta), { recursive: true });
  writeFileSync(join(raiz, "dist", p.ruta, "index.html"), pagina);
  console.log(`Página legal prerenderizada en dist/${p.ruta}/index.html`);
}
rmSync(join(raiz, "dist-ssr"), { recursive: true, force: true });

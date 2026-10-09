// Prerenderiza la página pública de Stockly dentro de dist/index.html para que Google
// la lea sin ejecutar JavaScript. Se ejecuta después de "vite build" y "vite build --ssr".
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const archivo = join(raiz, "dist", "index.html");
const { render } = await import(pathToFileURL(join(raiz, "dist-ssr", "entry-server.js")).href);
const { html, estilos, jsonLd } = render();

const ld = jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, "\\u003c")}</script>`).join("\n    ");
let pagina = readFileSync(archivo, "utf8");
if (!pagina.includes('<div id="root"></div>')) throw new Error("No se encontró <div id=\"root\"></div> en dist/index.html");
pagina = pagina
  .replace("</head>", `    ${estilos}\n    ${ld}\n  </head>`)
  .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
writeFileSync(archivo, pagina);
rmSync(join(raiz, "dist-ssr"), { recursive: true, force: true });
console.log("Página pública prerenderizada en dist/index.html");

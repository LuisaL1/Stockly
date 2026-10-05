// Prepara un logo para guardarlo: lo convierte a PNG (el PDF no lee SVG ni WebP),
// recorta los bordes transparentes y lo reduce a un tamaño razonable.
const MAX_ANCHO = 800;
const MAX_ALTO = 400;

function cargar(archivo) {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolver(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("No pudimos leer la imagen. Prueba con un PNG o JPG."));
    };
    img.src = url;
  });
}

// Color de fondo: si las cuatro esquinas son opacas y del mismo color (p. ej. un JPG con fondo blanco).
function colorDeFondo(data, ancho, alto) {
  const px = (x, y) => {
    const i = (y * ancho + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const esquinas = [px(0, 0), px(ancho - 1, 0), px(0, alto - 1), px(ancho - 1, alto - 1)];
  if (esquinas.some((c) => c[3] < 250)) return null;
  const [r, g, b] = esquinas[0];
  const parecido = esquinas.every((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) < 30);
  return parecido ? [r, g, b] : null;
}

// Caja que contiene el logo: sin bordes transparentes ni márgenes del color de fondo.
function recorte(ctx, ancho, alto) {
  const { data } = ctx.getImageData(0, 0, ancho, alto);
  const fondo = colorDeFondo(data, ancho, alto);
  const esContenido = (i) =>
    data[i + 3] > 8 &&
    (!fondo || Math.abs(data[i] - fondo[0]) + Math.abs(data[i + 1] - fondo[1]) + Math.abs(data[i + 2] - fondo[2]) > 40);
  let x0 = ancho, y0 = alto, x1 = -1, y1 = -1;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (esContenido((y * ancho + x) * 4)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return { x: 0, y: 0, w: ancho, h: alto };
  // Un pequeño margen para que el logo no quede pegado al borde.
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
  const x = Math.max(0, x0 - m);
  const y = Math.max(0, y0 - m);
  return { x, y, w: Math.min(ancho, x1 + m + 1) - x, h: Math.min(alto, y1 + m + 1) - y };
}

export async function prepararLogo(archivo) {
  if (!archivo?.type?.startsWith("image/")) throw new Error("El logo debe ser una imagen (PNG, JPG, SVG o WebP).");
  if (archivo.size > 8 * 1024 * 1024) throw new Error("La imagen pesa más de 8 MB. Usa una más liviana.");
  const img = await cargar(archivo);
  const anchoOriginal = img.naturalWidth || 600;
  const altoOriginal = img.naturalHeight || 300;

  // 1. Dibujar a tamaño original (limitado) para recortar los bordes transparentes.
  const escala0 = Math.min(1, 2000 / Math.max(anchoOriginal, altoOriginal));
  const base = document.createElement("canvas");
  base.width = Math.round(anchoOriginal * escala0);
  base.height = Math.round(altoOriginal * escala0);
  const ctx = base.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, base.width, base.height);
  const r = recorte(ctx, base.width, base.height);

  // 2. Reducir al tamaño final.
  const escala = Math.min(1, MAX_ANCHO / r.w, MAX_ALTO / r.h);
  const final = document.createElement("canvas");
  final.width = Math.max(1, Math.round(r.w * escala));
  final.height = Math.max(1, Math.round(r.h * escala));
  final.getContext("2d").drawImage(base, r.x, r.y, r.w, r.h, 0, 0, final.width, final.height);

  const blob = await new Promise((ok) => final.toBlob(ok, "image/png"));
  if (!blob) throw new Error("No pudimos procesar la imagen.");
  return { blob, ancho: final.width, alto: final.height };
}

// Carga una imagen remota como data URL (para el PDF) y devuelve sus medidas. null si falla.
export async function imagenComoDataUrl(url) {
  try {
    const respuesta = await fetch(url, { cache: "no-cache" });
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    const dataUrl = await new Promise((ok, mal) => {
      const lector = new FileReader();
      lector.onload = () => ok(lector.result);
      lector.onerror = mal;
      lector.readAsDataURL(blob);
    });
    const img = await new Promise((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = mal;
      i.src = dataUrl;
    });
    return { url: dataUrl, ancho: img.naturalWidth, alto: img.naturalHeight };
  } catch {
    return null;
  }
}

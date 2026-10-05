// Estado y datos de ejemplo de la guía "Registrar un producto".

const CLAVE_VISTA = "stockly_guia_producto_vista";

// La guía se abre sola una vez por navegador (después de la primera importación).
export function guiaProductoVista() {
  try {
    return localStorage.getItem(CLAVE_VISTA) === "1";
  } catch {
    return true;
  }
}
export function marcarGuiaProductoVista() {
  try {
    localStorage.setItem(CLAVE_VISTA, "1");
  } catch {
    // Sin almacenamiento: la guía se puede volver a abrir a mano.
  }
}

// Convierte una fila de la tabla de productos (o del Excel) en el ejemplo de la guía.
export function ejemploDesdeProducto(p) {
  if (!p) return null;
  return {
    nombre: p.nombre ?? p.descripcion,
    categoria: p.categoria,
    color: p.color,
    marca: p.marca,
    codigo_interno: p.codigo_interno ?? p.codigointerno,
    codigo_barras: p.codigo_barras ?? p.codigobarras,
    precio_compra: p.precio_compra ?? p.preciocompra,
    precio_venta: p.precio_venta ?? p.precioventa,
    stock: p.stock,
    stock_minimo: p.stock_minimo,
  };
}


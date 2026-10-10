import { cantidadConUnidad } from "./unidades";
import { formatearMonedaCorta, formatearNumero } from "./conversiones";
import { NombresMetodo } from "./dataEstatica";

// Número para wa.me: solo dígitos y con indicativo de Colombia si es un celular de 10 dígitos.
export function numeroWhatsApp(telefono) {
  const digitos = String(telefono ?? "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.length === 10 && digitos.startsWith("3")) return `57${digitos}`;
  return digitos;
}

// Mensaje con el resumen de la factura, cómo pagar y, si existe, el link de pago.
export function mensajeFactura({ venta, empresa, cfg, linkPago }) {
  const moneda = empresa?.simbolomoneda ?? "$";
  const dinero = (n) => formatearMonedaCorta(n, moneda);
  const pagos = venta.pagos_venta ?? [];
  const pagado = pagos.filter((p) => p.estado === "aprobado").reduce((a, p) => a + Number(p.monto), 0);
  const saldo = Math.max(Number(venta.total) - pagado, 0);
  const nombre = venta.clientes?.nombre?.split(" ")[0];

  const lineas = [
    `Hola${nombre ? ` ${nombre}` : ""}, te compartimos tu factura de *${empresa?.nombre ?? "nuestra tienda"}*.`,
    "",
    `*Factura ${venta.prefijo}-${venta.numero}* · ${new Date(venta.fecha).toLocaleDateString("es-CO")}`,
    ...venta.detalle_venta.map((d) => `• ${d.presentacion || (d.unidad && d.unidad !== "und") ? cantidadConUnidad(d.cantidad, d) : formatearNumero(d.cantidad)} × ${d.descripcion}: ${dinero(d.total)}`),
    "",
    `*Total: ${dinero(venta.total)}*`,
  ];

  if (saldo > 0 && venta.estado !== "anulada") {
    lineas.push(`Saldo por pagar: *${dinero(saldo)}*`);
    if (linkPago) lineas.push("", `👉 *Paga aquí con tarjeta, PSE o Nequi:*`, linkPago);
    if (cfg?.breb_llave) {
      lineas.push("", `${linkPago ? "O paga" : "Paga"} al instante desde cualquier banco con Bre-B a la llave: *${cfg.breb_llave}*`);
    }
    if (cfg?.numero_cuenta) {
      lineas.push(
        "",
        cfg?.breb_llave ? "O transfiere a:" : "También puedes transferir a:",
        `${cfg.banco ?? "Banco"} · ${cfg.tipo_cuenta ?? "Cuenta"} ${cfg.numero_cuenta}`,
        cfg.titular_cuenta ? `A nombre de ${cfg.titular_cuenta}` : null
      );
    }
    if (cfg?.breb_llave || cfg?.numero_cuenta) lineas.push("Envíanos el comprobante por este chat.");
  } else if (venta.estado !== "anulada") {
    const medios = [
      ...new Set(
        pagos
          .filter((p) => p.estado === "aprobado")
          .map((p) => (p.metodo === "bre_b" ? "Bre-B" : (NombresMetodo[p.metodo] ?? p.metodo).toLowerCase()))
      ),
    ];
    lineas.push(`Pagada${medios.length ? ` con ${medios.join(" y ")}` : ""}. ¡Gracias por tu compra!`);
  }
  if (cfg?.nota_pie) lineas.push("", cfg.nota_pie);
  return lineas.filter((l) => l !== null).join("\n");
}

// Mensaje corto solo con el link de pago (para enviarlo aparte del PDF).
export function mensajeLinkPago({ venta, empresa, linkPago, saldo }) {
  const moneda = empresa?.simbolomoneda ?? "$";
  const nombre = venta.clientes?.nombre?.split(" ")[0];
  return [
    `Hola${nombre ? ` ${nombre}` : ""}, este es el link para pagar tu factura *${venta.prefijo}-${venta.numero}* de *${empresa?.nombre ?? "nuestra tienda"}*` +
      ` por *${formatearMonedaCorta(saldo, moneda)}*:`,
    "",
    `👉 ${linkPago}`,
    "",
    "Puedes pagar con tarjeta, PSE o Nequi. Apenas pagues, tu factura queda al día.",
  ].join("\n");
}

export function abrirWhatsApp(telefono, mensaje) {
  window.open(urlWhatsApp(telefono, mensaje), "_blank", "noopener");
}

export function urlWhatsApp(telefono, mensaje) {
  return `https://wa.me/${numeroWhatsApp(telefono)}?text=${encodeURIComponent(mensaje)}`;
}

// En celulares se comparte el PDF directo con el menú del teléfono (la persona elige WhatsApp
// y el contacto). En computador WhatsApp no recibe archivos por enlace: se abre el chat con el
// mensaje y un enlace para descargar el PDF.
export function esCompartirDirecto() {
  try {
    const tactil = window.matchMedia?.("(pointer: coarse)").matches;
    const prueba = new File([""], "factura.pdf", { type: "application/pdf" });
    return !!(tactil && navigator.canShare?.({ files: [prueba] }));
  } catch {
    return false;
  }
}

// Comparte el archivo con el menú del teléfono. Devuelve "compartido", "cancelado" o "fallo".
export async function compartirArchivo(archivo, mensaje) {
  try {
    await navigator.share({ files: [archivo], title: archivo.name, text: mensaje });
    return "compartido";
  } catch (e) {
    return e?.name === "AbortError" ? "cancelado" : "fallo";
  }
}

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
    ...venta.detalle_venta.map((d) => `• ${formatearNumero(d.cantidad)} × ${d.descripcion}: ${dinero(d.total)}`),
    "",
    `*Total: ${dinero(venta.total)}*`,
  ];

  if (saldo > 0 && venta.estado !== "anulada") {
    lineas.push(`Saldo por pagar: *${dinero(saldo)}*`);
    if (linkPago) lineas.push("", `Paga en línea con tarjeta, PSE o Nequi aquí:`, linkPago);
    if (cfg?.numero_cuenta) {
      lineas.push(
        "",
        "También puedes transferir a:",
        `${cfg.banco ?? "Banco"} · ${cfg.tipo_cuenta ?? "Cuenta"} ${cfg.numero_cuenta}`,
        cfg.titular_cuenta ? `A nombre de ${cfg.titular_cuenta}` : null,
        "Envíanos el comprobante por este chat."
      );
    }
  } else if (venta.estado !== "anulada") {
    const medios = [...new Set(pagos.filter((p) => p.estado === "aprobado").map((p) => NombresMetodo[p.metodo] ?? p.metodo))];
    lineas.push(`Pagada${medios.length ? ` con ${medios.join(" y ").toLowerCase()}` : ""}. ¡Gracias por tu compra!`);
  }
  if (cfg?.nota_pie) lineas.push("", cfg.nota_pie);
  return lineas.filter((l) => l !== null).join("\n");
}

export function abrirWhatsApp(telefono, mensaje) {
  const numero = numeroWhatsApp(telefono);
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank", "noopener");
}

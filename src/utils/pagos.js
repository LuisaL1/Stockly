const redondear = (n) => Math.round(Number(n || 0) * 100) / 100;

// Pagos listos para enviar: con un solo medio, el monto es el total de la venta.
export function normalizarPagos(pagos, total) {
  if (pagos.length === 1) return [{ ...pagos[0], monto: redondear(total) }];
  return pagos.map((p) => ({ ...p, monto: redondear(p.monto) }));
}

// Devuelve el primer problema (texto) o null si los pagos son válidos.
export function validarPagos(pagos, total) {
  const lista = normalizarPagos(pagos, total);
  const suma = lista.reduce((a, p) => a + p.monto, 0);
  for (const p of lista) {
    if (!(p.monto > 0)) return "Cada pago debe tener un valor mayor que cero.";
    if (p.metodo === "efectivo" && p.recibido !== "" && p.recibido != null && Number(p.recibido) < p.monto)
      return "El efectivo recibido es menor que el valor en efectivo.";
    if (p.metodo === "datafono" && !String(p.referencia ?? "").trim()) return "Escribe el número de aprobación del datáfono.";
  }
  if (Math.abs(suma - redondear(total)) > 1) return "Los pagos no suman el total de la venta.";
  return null;
}

export const pagoVacio = (metodo = "efectivo") => ({ metodo, monto: 0, recibido: "", referencia: "", franquicia: "", banco: "" });

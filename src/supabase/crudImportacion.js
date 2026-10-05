import { supabase } from "./supabase.config";

// Tamaño de cada parte: cada llamada es una transacción y debe terminar antes del límite de tiempo de Supabase.
const PARTES = { clientes: 500, productos: 250, inventario: 400 };

function sumar(total, parcial) {
  for (const [k, v] of Object.entries(parcial ?? {})) {
    if (typeof v === "number") total[k] = (total[k] ?? 0) + v;
    else total[k] = { creados: (total[k]?.creados ?? 0) + (v.creados ?? 0), actualizados: (total[k]?.actualizados ?? 0) + (v.actualizados ?? 0) };
  }
  return total;
}

// Envía los datos en orden (primero catálogos y bodegas, luego productos e inventario).
// onProgreso(hechas, total, etiqueta). Devuelve { resumen, error, parteFallida }.
export async function ImportarDatos(idEmpresa, datos, onProgreso) {
  const pasos = [];
  const base = Object.fromEntries(
    ["empresa", "categorias", "marcas", "sucursales", "bodegas", "proveedores"].filter((k) => datos[k]).map((k) => [k, datos[k]])
  );
  if (Object.keys(base).length) pasos.push({ etiqueta: "Empresa, catálogos y bodegas", datos: base });
  for (const clave of ["productos", "inventario", "clientes"]) {
    const filas = datos[clave] ?? [];
    for (let i = 0; i < filas.length; i += PARTES[clave]) {
      const fin = Math.min(i + PARTES[clave], filas.length);
      pasos.push({ etiqueta: `${clave[0].toUpperCase()}${clave.slice(1)} ${i + 1}–${fin}`, datos: { [clave]: filas.slice(i, fin) } });
    }
  }

  const resumen = {};
  for (const [i, paso] of pasos.entries()) {
    onProgreso?.(i, pasos.length, paso.etiqueta);
    const { data, error } = await supabase.rpc("stockly_importar", { _id_empresa: idEmpresa, _datos: paso.datos });
    if (error) {
      console.error("[Supabase] Importación:", error);
      return { resumen, error: error.message, parteFallida: paso.etiqueta, aplicadas: i, total: pasos.length };
    }
    sumar(resumen, data);
  }
  onProgreso?.(pasos.length, pasos.length, "Listo");
  return { resumen, error: null, aplicadas: pasos.length, total: pasos.length };
}

export async function AvisarImportacion(idEmpresa, texto) {
  await supabase.rpc("stockly_importacion_terminada", { _id_empresa: idEmpresa, _resumen: texto });
}

export async function ExportarDatos(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_exportar", { _id_empresa: idEmpresa });
  if (error) throw error;
  return data;
}

// ------------------------------------------------------------- Eliminación de datos

export async function ConteoDatos(idEmpresa) {
  const { data, error } = await supabase.rpc("stockly_conteo_datos", { _id_empresa: idEmpresa });
  if (error) throw error;
  return data;
}

// Segundo paso: código de un solo uso enviado al correo de la cuenta (no crea usuarios).
export async function EnviarCodigoCorreo(email) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw error;
}

export async function VerificarCodigoCorreo(email, codigo) {
  const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "email" });
  if (error) throw error;
}

export async function EliminarDatos(idEmpresa, alcances, confirmacion) {
  const { data, error } = await supabase.rpc("stockly_eliminar_datos", {
    _id_empresa: idEmpresa,
    _alcances: alcances,
    _confirmacion: confirmacion,
  });
  if (error) throw error;
  return data;
}

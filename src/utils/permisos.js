// Nombres de módulo tal como están en la tabla "modulos" de Supabase.
export const MODULOS = {
  productos: "Productos",
  personal: "Personal",
  empresa: "Tu empresa",
  categorias: "Categoria de productos",
  marcas: "Marca de productos",
  ventas: "Ventas",
  bodegas: "Bodegas",
  compras: "Compras",
  clientes: "Clientes",
  proveedores: "Proveedores",
  suscripcion: "Suscripción",
  facturacion: "Facturación",
  sucursales: "Sucursales",
  inteligencia: "Inteligencia",
  red: "Red",
};

// Dueño o administrador de la empresa (la auditoría y los permisos de Novandra son solo para ellos).
export function esAdmin(usuario) {
  return ["dueño", "administrador", "admin", "encargado"].includes((usuario?.tipouser ?? "").toLowerCase());
}

export function tienePermiso(datapermisos, modulo) {
  return (datapermisos ?? []).some((p) => p.modulos?.nombre?.includes(modulo));
}

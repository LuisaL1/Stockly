import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../hooks/ProtectedRoute";
import { Layout } from "../Components/templatesReact/Layout";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { Login } from "../pages/Login";
import { NoEncontrado } from "../pages/NoEncontrado";
import { Restablecer } from "../pages/Restablecer";
import { Privacidad, Terminos } from "../pages/Legal";

// Las pantallas de la app se cargan bajo demanda: la página pública y el inicio de sesión
// cargan rápido (también cuenta para Google). Layout muestra la carga con <Suspense>.
const Home = lazy(() => import("../pages/Home").then((m) => ({ default: m.Home })));
const Configuracion = lazy(() => import("../pages/Configuracion").then((m) => ({ default: m.Configuracion })));
const Marca = lazy(() => import("../pages/Marca").then((m) => ({ default: m.Marca })));
const Categorias = lazy(() => import("../pages/Categorias").then((m) => ({ default: m.Categorias })));
const Productos = lazy(() => import("../pages/Productos").then((m) => ({ default: m.Productos })));
const Usuarios = lazy(() => import("../pages/Usuarios").then((m) => ({ default: m.Usuarios })));
const Empresa = lazy(() => import("../pages/Empresa").then((m) => ({ default: m.Empresa })));
const Kardex = lazy(() => import("../pages/Kardex").then((m) => ({ default: m.Kardex })));
const Ventas = lazy(() => import("../pages/Ventas").then((m) => ({ default: m.Ventas })));
const Facturas = lazy(() => import("../pages/Facturas").then((m) => ({ default: m.Facturas })));
const Bodegas = lazy(() => import("../pages/Bodegas").then((m) => ({ default: m.Bodegas })));
const Compras = lazy(() => import("../pages/Compras").then((m) => ({ default: m.Compras })));
const Notificaciones = lazy(() => import("../pages/Notificaciones").then((m) => ({ default: m.Notificaciones })));
const Plan = lazy(() => import("../pages/Plan").then((m) => ({ default: m.Plan })));
const ConfigFacturacion = lazy(() => import("../pages/ConfigFacturacion").then((m) => ({ default: m.ConfigFacturacion })));
const Perfil = lazy(() => import("../pages/Perfil").then((m) => ({ default: m.Perfil })));
const Sucursales = lazy(() => import("../pages/Sucursales").then((m) => ({ default: m.Sucursales })));
const Inteligencia = lazy(() => import("../pages/Inteligencia").then((m) => ({ default: m.Inteligencia })));
const Auditoria = lazy(() => import("../pages/Auditoria").then((m) => ({ default: m.Auditoria })));
const ConfigNovandra = lazy(() => import("../pages/ConfigNovandra").then((m) => ({ default: m.ConfigNovandra })));
const ImportarExportar = lazy(() => import("../pages/ImportarExportar").then((m) => ({ default: m.ImportarExportar })));
const Ayuda = lazy(() => import("../pages/Ayuda").then((m) => ({ default: m.Ayuda })));
const InformeContable = lazy(() => import("../pages/InformeContable").then((m) => ({ default: m.InformeContable })));
const Clientes = lazy(() => import("../pages/Contactos").then((m) => ({ default: m.Clientes })));
const Proveedores = lazy(() => import("../pages/Contactos").then((m) => ({ default: m.Proveedores })));

// Los reportes usan @react-pdf/renderer (muy pesado): se cargan bajo demanda.
const Reportes = lazy(() => import("../pages/Reportes"));
const StockActualTodos = lazy(() => import("../Components/organismos/reportes/StockActualTodos"));
const StockActualPorProducto = lazy(() => import("../Components/organismos/reportes/StockActualPorProducto"));
const StockBajoMinimo = lazy(() => import("../Components/organismos/reportes/StockBajoMinimo"));
const KardexEntradasSalidas = lazy(() => import("../Components/organismos/reportes/KardexEntradasSalidas"));
const StockInventarioValorado = lazy(() => import("../Components/organismos/reportes/StockInventarioValorado"));

const conCarga = (elemento) => <Suspense fallback={<SpinnerLoader />}>{elemento}</Suspense>;

export function MyRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <ProtectedRoute accessBy="non-authenticated">
            <Login />
          </ProtectedRoute>
        }
      />
      <Route path="/restablecer" element={<Restablecer />} />
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/privacidad" element={<Privacidad />} />
      <Route
        element={
          <ProtectedRoute accessBy="authenticated">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/configurar" element={<Configuracion />} />
        <Route path="/configurar/marca" element={<Marca />} />
        <Route path="/configurar/categorias" element={<Categorias />} />
        <Route path="/configurar/productos" element={<Productos />} />
        <Route path="/configurar/usuarios" element={<Usuarios />} />
        <Route path="/configurar/empresa" element={<Empresa />} />
        <Route path="/configurar/plan" element={<Plan />} />
        <Route path="/configurar/facturacion" element={<ConfigFacturacion />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/ventas/facturas" element={<Facturas />} />
        <Route path="/bodegas" element={<Bodegas />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/proveedores" element={<Proveedores />} />
        <Route path="/notificaciones" element={<Notificaciones />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/sucursales" element={<Sucursales />} />
        <Route path="/inteligencia" element={<Inteligencia />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/configurar/novandra" element={<ConfigNovandra />} />
        <Route path="/configurar/datos" element={<ImportarExportar />} />
        <Route path="/ayuda" element={<Ayuda />} />
        <Route path="/informe-contable" element={<InformeContable />} />
        <Route path="/kardex" element={<Kardex />} />
        <Route path="/reportes" element={conCarga(<Reportes />)}>
          <Route index element={<Navigate to="stock-actual-todos" replace />} />
          <Route path="stock-actual-todos" element={conCarga(<StockActualTodos />)} />
          <Route path="stock-actual-por-producto" element={conCarga(<StockActualPorProducto />)} />
          <Route path="stock-bajo-minimo" element={conCarga(<StockBajoMinimo />)} />
          <Route path="kardex-entradas-salidas" element={conCarga(<KardexEntradasSalidas />)} />
          <Route path="inventario-valorado" element={conCarga(<StockInventarioValorado />)} />
        </Route>
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}

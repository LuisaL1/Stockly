import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../hooks/ProtectedRoute";
import { Layout } from "../Components/templatesReact/Layout";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { Login } from "../pages/Login";
import { Home } from "../pages/Home";
import { Configuracion } from "../pages/Configuracion";
import { Marca } from "../pages/Marca";
import { Categorias } from "../pages/Categorias";
import { Productos } from "../pages/Productos";
import { Usuarios } from "../pages/Usuarios";
import { Empresa } from "../pages/Empresa";
import { Kardex } from "../pages/Kardex";
import { NoEncontrado } from "../pages/NoEncontrado";
import { Ventas } from "../pages/Ventas";
import { Facturas } from "../pages/Facturas";
import { Bodegas } from "../pages/Bodegas";
import { Compras } from "../pages/Compras";
import { Clientes, Proveedores } from "../pages/Contactos";
import { Notificaciones } from "../pages/Notificaciones";
import { Plan } from "../pages/Plan";
import { ConfigFacturacion } from "../pages/ConfigFacturacion";
import { Restablecer } from "../pages/Restablecer";
import { Perfil } from "../pages/Perfil";
import { Sucursales } from "../pages/Sucursales";
import { Inteligencia } from "../pages/Inteligencia";
import { Auditoria } from "../pages/Auditoria";
import { ConfigNovandra } from "../pages/ConfigNovandra";

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

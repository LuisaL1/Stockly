import { Routes, Route } from "react-router-dom";
import { Home, Login, ProtectedRoute, UserAuth, useUsuariosStore
  ,SpinnerLoader,
  ErrorMolecula,
  Marca, Categorias,
  Productos, 
  Usuarios, Kardex,
  Reportes,
 } from "../index";
import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { Configuracion } from "../pages/Configuracion";
import {StockActualTodos, StockActualPorProducto, StockBajoMinimo, KardexEntradasSalidas,
  StockInventarioValorado
} from "../index";


export function MyRoutes() {
  const { user } = UserAuth();
  const {MostrarUsuarios, idusuario, MostrarPermisos} = useUsuariosStore();
  const {MostrarEmpresa} = useEmpresaStore();

  
  const { data:datausuarios, isLoading, error } = useQuery({
  queryKey: ["mostrar usuarios"],
  queryFn: MostrarUsuarios,
});
const {data:empresa}=useQuery({queryKey:["mostrar empresa"],queryFn:()=>MostrarEmpresa({idusuario:idusuario}),
enabled:!!datausuarios})
const {data:datapermisos}=useQuery({queryKey:["mostrar permisos",{id_usuario:idusuario}],queryFn:()=>MostrarPermisos({id_usuario:idusuario}),
enabled:!!datausuarios})

  if (isLoading){
    return <SpinnerLoader/>
  }
if (error) {
  return <ErrorMolecula mensaje={error.message} />;
}

  return ( 
    <Routes>
      <Route path="/login"  element={<Login />} />
        <Route path="/" element={<Home />} />     
        <Route path="/configurar" element={<Configuracion />} />        
        <Route path="/configurar/marca" element={<Marca />} />
        <Route path="/configurar/categorias" element={<Categorias />} />
        <Route path="/configurar/productos" element={<Productos />} />
        <Route path="/configurar/usuarios" element={<Usuarios />} />
        <Route path="/kardex" element={<Kardex/>} />
        <Route path="/reportes" element={<Reportes/>}>
        <Route path="stock-actual-todos" element={<StockActualTodos/>}/>
        <Route path="stock-actual-por-producto" element={<StockActualPorProducto/>}/>
        <Route path="stock-bajo-minimo" element={<StockBajoMinimo/>}/>
        <Route path="kardex-entradas-salidas" element={<KardexEntradasSalidas/>}/>
        <Route path="inventario-valorado" element={<StockInventarioValorado/>}/>
        </Route>
    </Routes>
  );
}


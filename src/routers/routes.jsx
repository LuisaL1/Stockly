import { Routes, Route } from "react-router-dom";
import { Home, Login, ProtectedRoute, UserAuth, useUsuariosStore
  ,SpinnerLoader,
  ErrorMolecula,
  Marca, Categorias,
  Productos
 } from "../index";
import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../store/EmpresaStore";
import { Configuracion } from "../pages/Configuracion";

export function MyRoutes() {
  const { user } = UserAuth();
  const {MostrarUsuarios, idusuario} = useUsuariosStore();
  const {MostrarEmpresa} = useEmpresaStore()
  const { data:datausuarios, isLoading, error } = useQuery({
  queryKey: ["mostrar usuarios"],
  queryFn: MostrarUsuarios,
});
const {data:empresa}=useQuery({queryKey:["mostrar empresa"],queryFn:()=>MostrarEmpresa({idusuario:idusuario}),
enabled:!!datausuarios})
  if (isLoading){
    return <SpinnerLoader/>
  }
if (error) {
  return <ErrorMolecula mensaje={error.message} />;
}

  return ( 
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute user={user} redirectTo="/login" />}>
        <Route path="/" element={<Home />} />     
        <Route path="/configurar" element={<Configuracion />} />        
        <Route path="/configurar/marca" element={<Marca />} />
        <Route path="/configurar/categorias" element={<Categorias />} />
        <Route path="/configurar/productos" element={<Productos />} />
      </Route>
      
    </Routes>
  );
}


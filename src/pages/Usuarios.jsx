import { useState } from "react";
import { CrudTemplate } from "../Components/templatesReact/CrudTemplate";
import { BotonLimpiar, SelectFiltro } from "../Components/moleculas/Filtros";
import { opcionesDesde } from "../utils/filtros";
import { TablaUsuarios } from "../Components/organismos/tablas/TablaUsuarios";
import { RegistrarUsuarios } from "../Components/organismos/formularios/RegistrarUsuarios";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useUsuariosStore } from "../store/UsuariosStore";
import { usePaginaCrud } from "../hooks/usePaginaCrud";
import { MODULOS } from "../utils/permisos";
import { usePlan } from "../hooks/usePlan";

export function Usuarios() {
  return (
    <ConPermiso modulo={MODULOS.personal}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { setBuscador } = useUsuariosStore();
  const { data, isLoading, error, refetch } = usePaginaCrud("personal", useUsuariosStore);

  const { alcanzado, limite, plan } = usePlan();
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState("");

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  return (
    <CrudTemplate
      titulo="Personal"
      descripcion="Quiénes usan Stockly en tu empresa y qué pueden hacer."
      textoNuevo="Nuevo usuario"
      placeholderBusqueda="Buscar por nombre..."
      setBuscador={setBuscador}
      data={(data ?? []).filter((u) => (!rol || String(u.tipouser ?? "").toLowerCase() === rol) && (!estado || String(u.estado ?? "").toLowerCase() === estado))}
      Tabla={TablaUsuarios}
      filtros={
        <>
          <SelectFiltro etiqueta="Rol" todos="Todos los roles" valor={rol} onChange={setRol} opciones={opcionesDesde((data ?? []).map((u) => ({ rol: String(u.tipouser ?? "").toLowerCase() })), "rol").map((o) => ({ id: o.id, descripcion: o.descripcion.charAt(0).toUpperCase() + o.descripcion.slice(1) }))} />
          <SelectFiltro etiqueta="Estado" todos="Todos los estados" valor={estado} onChange={setEstado} opciones={opcionesDesde((data ?? []).map((u) => ({ estado: String(u.estado ?? "").toLowerCase() })), "estado").map((o) => ({ id: o.id, descripcion: o.descripcion.charAt(0).toUpperCase() + o.descripcion.slice(1) }))} />
          <BotonLimpiar visible={!!(rol || estado)} onClick={() => { setRol(""); setEstado(""); }} />
        </>
      }
      bloqueoNuevo={
        alcanzado("usuarios") && `Tu plan ${plan?.nombre ?? ""} permite ${limite("usuarios")} usuarios. Mejóralo en Configuración → Plan.`
      }
      Formulario={RegistrarUsuarios}
    />
  );
}

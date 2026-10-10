import { CrudTemplate } from "../Components/templatesReact/CrudTemplate";
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

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  return (
    <CrudTemplate
      titulo="Personal"
      descripcion="Quiénes usan Stockly en tu empresa y qué pueden hacer."
      textoNuevo="Nuevo usuario"
      placeholderBusqueda="Buscar por nombre..."
      setBuscador={setBuscador}
      data={data}
      Tabla={TablaUsuarios}
      bloqueoNuevo={
        alcanzado("usuarios") && `Tu plan ${plan?.nombre ?? ""} permite ${limite("usuarios")} usuarios. Mejóralo en Configuración → Plan.`
      }
      Formulario={RegistrarUsuarios}
    />
  );
}

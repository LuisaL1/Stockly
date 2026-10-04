import { useUsuariosStore } from "../../store/UsuariosStore";
import { tienePermiso } from "../../utils/permisos";
import { SpinnerLoader } from "./SpinnerLoader";
import { BloqueoPagina } from "./BloqueoPagina";

// Muestra el contenido solo si el usuario tiene permiso al módulo.
export function ConPermiso({ modulo, children }) {
  const { datapermisos, permisosCargados } = useUsuariosStore();
  if (!modulo) return children;
  if (!permisosCargados) return <SpinnerLoader />;
  if (!tienePermiso(datapermisos, modulo)) return <BloqueoPagina modulo={modulo} />;
  return children;
}

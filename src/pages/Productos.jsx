import { CrudTemplate } from "../Components/templatesReact/CrudTemplate";
import { TablaProductos } from "../Components/organismos/tablas/TablaProductos";
import { RegistrarProductos } from "../Components/organismos/formularios/RegistrarProductos";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useProductosStore } from "../store/ProductosStore";
import { usePaginaCrud } from "../hooks/usePaginaCrud";
import { MODULOS } from "../utils/permisos";
import { usePlan } from "../hooks/usePlan";

export function Productos() {
  return (
    <ConPermiso modulo={MODULOS.productos}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { setBuscador } = useProductosStore();
  const { data, isLoading, error, refetch } = usePaginaCrud("productos", useProductosStore);

  const { alcanzado, limite, plan } = usePlan();

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  return (
    <CrudTemplate
      titulo="Productos"
      descripcion="Tu catálogo con precios y niveles de stock."
      textoNuevo="Nuevo producto"
      placeholderBusqueda="Buscar producto..."
      setBuscador={setBuscador}
      data={data}
      Tabla={TablaProductos}
      bloqueoNuevo={
        alcanzado("productos") && `Tu plan ${plan?.nombre ?? ""} permite ${limite("productos")} productos. Mejóralo en Configuración → Plan.`
      }
      Formulario={RegistrarProductos}
    />
  );
}

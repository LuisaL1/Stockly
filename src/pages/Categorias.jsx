import { CrudTemplate } from "../Components/templatesReact/CrudTemplate";
import { TablaCategorias } from "../Components/organismos/tablas/TablaCategorias";
import { RegistrarCategorias } from "../Components/organismos/formularios/RegistrarCategorias";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useCategoriasStore } from "../store/CategoriasStore";
import { usePaginaCrud } from "../hooks/usePaginaCrud";
import { MODULOS } from "../utils/permisos";

export function Categorias() {
  return (
    <ConPermiso modulo={MODULOS.categorias}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { setBuscador } = useCategoriasStore();
  const { data, isLoading, error, refetch } = usePaginaCrud("categorias", useCategoriasStore);

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  return (
    <CrudTemplate
      titulo="Categorías"
      descripcion="Agrupa tus productos. Encuéntralos más rápido."
      textoNuevo="Nueva categoría"
      placeholderBusqueda="Buscar categoría..."
      setBuscador={setBuscador}
      data={data}
      Tabla={TablaCategorias}
      Formulario={RegistrarCategorias}
    />
  );
}

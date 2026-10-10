import { CrudTemplate } from "../Components/templatesReact/CrudTemplate";
import { TablaMarca } from "../Components/organismos/tablas/TablaMarca";
import { RegistrarMarca } from "../Components/organismos/formularios/RegistrarMarca";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useMarcaStore } from "../store/MarcaStore";
import { usePaginaCrud } from "../hooks/usePaginaCrud";
import { MODULOS } from "../utils/permisos";

export function Marca() {
  return (
    <ConPermiso modulo={MODULOS.marcas}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { setBuscador } = useMarcaStore();
  const { data, isLoading, error, refetch } = usePaginaCrud("marcas", useMarcaStore);

  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;

  return (
    <CrudTemplate
      titulo="Marcas"
      descripcion="Las marcas que vendes."
      textoNuevo="Nueva marca"
      placeholderBusqueda="Buscar marca..."
      setBuscador={setBuscador}
      data={data}
      Tabla={TablaMarca}
      Formulario={RegistrarMarca}
    />
  );
}

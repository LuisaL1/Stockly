import { KardexTemplate } from "../Components/templatesReact/KardexTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useKardexStore } from "../store/KardexStore";
import { usePaginaCrud } from "../hooks/usePaginaCrud";
import { MODULOS } from "../utils/permisos";

export function Kardex() {
  return (
    <ConPermiso modulo={MODULOS.productos}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { data, isLoading, error, refetch } = usePaginaCrud("kardex", useKardexStore);
  if (isLoading) return <SpinnerLoader />;
  if (error) return <ErrorMolecula mensaje={error.message} reintentar={refetch} />;
  return <KardexTemplate data={data} />;
}

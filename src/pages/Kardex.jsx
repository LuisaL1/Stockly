import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { KardexTemplate } from "../Components/templatesReact/KardexTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { useEmpresaStore } from "../store/EmpresaStore";
import { MostrarKardex } from "../supabase/crudKardex";
import { ObtenerProducto } from "../supabase/crudProductos";
import { MODULOS } from "../utils/permisos";

const FILTROS_INICIALES = { id_bodega: "", tipo: "", origen: "", desde: "", hasta: "", texto: "" };

export function Kardex() {
  return (
    <ConPermiso modulo={MODULOS.productos}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [producto, setProducto] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const idEmpresa = dataempresa?.id;

  // Llegar desde Productos ("Ver movimientos") deja el producto filtrado.
  const idProductoUrl = params.get("producto");
  useEffect(() => {
    if (!idProductoUrl) return;
    ObtenerProducto(idProductoUrl).then((p) => p && setProducto(p));
  }, [idProductoUrl]);

  const query = useQuery({
    queryKey: ["kardex", idEmpresa, producto?.id ?? null, filtros],
    queryFn: () => MostrarKardex({ idEmpresa, id_producto: producto?.id ?? "", ...filtros, limite: 500 }),
    enabled: idEmpresa != null,
    placeholderData: (previo) => previo,
  });

  if (query.error) return <ErrorMolecula mensaje={query.error.message} reintentar={query.refetch} />;
  return (
    <KardexTemplate
      data={query.data}
      cargando={query.isLoading}
      producto={producto}
      setProducto={setProducto}
      filtros={filtros}
      setFiltros={setFiltros}
      limpiar={() => {
        setProducto(null);
        setFiltros(FILTROS_INICIALES);
      }}
      recargar={() => queryClient.invalidateQueries()}
    />
  );
}

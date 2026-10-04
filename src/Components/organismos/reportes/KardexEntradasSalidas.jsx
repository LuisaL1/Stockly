import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportePDF } from "./ReportePDF";
import { SelectorProducto } from "./SelectorProducto";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ReportKardexEntradaSalida } from "../../../supabase/crudProductos";
import { formatearFecha, formatearNumero } from "../../../utils/conversiones";

export default function KardexEntradasSalidas() {
  const { dataempresa } = useEmpresaStore();
  const [producto, setProducto] = useState(null);
  const query = useQuery({
    queryKey: ["reporte kardex entrada y salida", dataempresa?.id, producto?.id],
    queryFn: () => ReportKardexEntradaSalida({ _id_empresa: dataempresa.id, _id_producto: producto.id }),
    enabled: !!dataempresa?.id && !!producto,
  });

  return (
    <ReportePDF
      titulo="Kardex de entradas y salidas"
      archivo="kardex-producto"
      orientacion="landscape"
      query={query}
      filtros={<SelectorProducto valor={producto} onChange={setProducto} />}
      sinSeleccion={!producto && <EstadoVacio titulo="Elige un producto" mensaje="Selecciona un producto para ver sus movimientos." />}
      columnas={[
        { clave: "fecha", titulo: "Fecha", flex: 1.2, formato: formatearFecha },
        { clave: "descripcion", titulo: "Producto", flex: 2.5 },
        { clave: "tipo", titulo: "Tipo" },
        { clave: "detalle", titulo: "Detalle", flex: 2 },
        { clave: "nombres", titulo: "Usuario", flex: 1.5 },
        { clave: "cantidad", titulo: "Cantidad", alinear: "right", formato: formatearNumero },
        { clave: "stock", titulo: "Stock", alinear: "right", formato: formatearNumero },
      ]}
    />
  );
}

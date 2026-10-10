import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportePDF } from "./ReportePDF";
import { SelectorProducto } from "./SelectorProducto";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ReportStockXProducto } from "../../../supabase/crudProductos";
import { formatearNumero } from "../../../utils/conversiones";

export default function StockActualPorProducto() {
  const { dataempresa } = useEmpresaStore();
  const [producto, setProducto] = useState(null);
  const query = useQuery({
    queryKey: ["reporte stock por producto", dataempresa?.id, producto?.id],
    queryFn: () => ReportStockXProducto({ id_empresa: dataempresa.id, id: producto.id }),
    enabled: !!dataempresa?.id && !!producto,
  });

  return (
    <ReportePDF
      titulo="Stock actual por producto"
      archivo="stock-por-producto"
      query={query}
      filtros={<SelectorProducto valor={producto} onChange={setProducto} />}
      sinSeleccion={!producto && <EstadoVacio titulo="Elige un producto" mensaje="Selecciona un producto para generar el reporte." />}
      columnas={[
        { clave: "nombre_completo", titulo: "Producto", flex: 3 },
        { clave: "stock_minimo", titulo: "Stock mínimo", alinear: "right", formato: formatearNumero },
        { clave: "stock", titulo: "Stock", alinear: "right", formato: formatearNumero },
      ]}
    />
  );
}

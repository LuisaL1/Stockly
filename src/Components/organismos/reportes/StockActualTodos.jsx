import { useQuery } from "@tanstack/react-query";
import { ReportePDF } from "./ReportePDF";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ReportStockProductosTodos } from "../../../supabase/crudProductos";
import { formatearNumero } from "../../../utils/conversiones";

export default function StockActualTodos() {
  const { dataempresa } = useEmpresaStore();
  const query = useQuery({
    queryKey: ["reporte stock todos", dataempresa?.id],
    queryFn: () => ReportStockProductosTodos({ id_empresa: dataempresa.id }),
    enabled: !!dataempresa?.id,
  });

  return (
    <ReportePDF
      titulo="Stock actual de todos los productos"
      archivo="stock-actual"
      query={query}
      columnas={[
        { clave: "nombre_completo", titulo: "Producto", flex: 3 },
        { clave: "stock_minimo", titulo: "Stock mínimo", alinear: "right", formato: formatearNumero },
        { clave: "stock", titulo: "Stock", alinear: "right", formato: formatearNumero },
      ]}
    />
  );
}

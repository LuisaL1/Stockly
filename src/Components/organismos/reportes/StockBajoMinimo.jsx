import { useQuery } from "@tanstack/react-query";
import { ReportePDF } from "./ReportePDF";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ReportStockBajoMinimo } from "../../../supabase/crudProductos";
import { formatearNumero } from "../../../utils/conversiones";

export default function StockBajoMinimo() {
  const { dataempresa } = useEmpresaStore();
  const query = useQuery({
    queryKey: ["reporte stock bajo minimo", dataempresa?.id],
    queryFn: () => ReportStockBajoMinimo({ id_empresa: dataempresa.id }),
    enabled: !!dataempresa?.id,
  });

  return (
    <ReportePDF
      titulo="Productos con stock bajo el mínimo"
      archivo="stock-bajo-minimo"
      query={query}
      resumen={(filas) => `${filas.length} productos necesitan reposición`}
      columnas={[
        { clave: "descripcion", titulo: "Producto", flex: 3 },
        { clave: "stock_minimo", titulo: "Stock mínimo", alinear: "right", formato: formatearNumero },
        { clave: "stock", titulo: "Stock actual", alinear: "right", formato: formatearNumero },
      ]}
    />
  );
}

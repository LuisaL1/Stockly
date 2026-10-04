import { useQuery } from "@tanstack/react-query";
import { ReportePDF } from "./ReportePDF";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ReportInventarioValorado } from "../../../supabase/crudProductos";
import { formatearMoneda, formatearNumero } from "../../../utils/conversiones";

export default function StockInventarioValorado() {
  const { dataempresa } = useEmpresaStore();
  const moneda = dataempresa?.simbolomoneda ?? "$";
  const query = useQuery({
    queryKey: ["reporte stock valorado", dataempresa?.id],
    queryFn: () => ReportInventarioValorado({ _id_empresa: dataempresa.id }),
    enabled: !!dataempresa?.id,
  });

  return (
    <ReportePDF
      titulo="Inventario valorizado"
      archivo="inventario-valorizado"
      query={query}
      resumen={(filas) =>
        `Valor total: ${formatearMoneda(filas.reduce((acc, f) => acc + Number(f.total ?? 0), 0), moneda)}`
      }
      columnas={[
        { clave: "descripcion", titulo: "Producto", flex: 3 },
        { clave: "stock", titulo: "Stock", alinear: "right", formato: formatearNumero },
        { clave: "preciocompra", titulo: "Precio compra", alinear: "right", flex: 1.4, formato: (x) => formatearMoneda(x, moneda) },
        { clave: "total", titulo: "Total", alinear: "right", flex: 1.4, formato: (x) => formatearMoneda(x, moneda) },
      ]}
    />
  );
}

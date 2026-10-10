import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportePDF } from "./ReportePDF";
import { SelectorProducto } from "./SelectorProducto";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { MostrarKardex } from "../../../supabase/crudKardex";
import { etiquetaOrigen } from "../../../utils/kardex";
import { formatearFechaHora, formatearNumero } from "../../../utils/conversiones";

// Kardex de un producto: cada movimiento con su origen y el saldo que dejó.
export default function KardexEntradasSalidas() {
  const { dataempresa } = useEmpresaStore();
  const [producto, setProducto] = useState(null);
  const query = useQuery({
    queryKey: ["reporte kardex producto", dataempresa?.id, producto?.id],
    queryFn: () => MostrarKardex({ idEmpresa: dataempresa.id, id_producto: producto.id, limite: 5000 }),
    enabled: !!dataempresa?.id && !!producto,
    select: (d) => (d.filas ?? []).map((f) => ({ ...f, origen_texto: etiquetaOrigen(f), cantidad_signo: f.tipo === "Salida" ? -f.cantidad : f.cantidad })),
  });

  return (
    <ReportePDF
      titulo={`Kardex${producto ? ` · ${producto.descripcion}` : ""}`}
      archivo="kardex-producto"
      orientacion="landscape"
      query={query}
      filtros={<SelectorProducto valor={producto} onChange={setProducto} />}
      sinSeleccion={!producto && <EstadoVacio titulo="Elige un producto" mensaje="Verás cada entrada y salida con su origen y el saldo que dejó." />}
      resumen={(filas) => (filas?.length ? `${filas.length} movimientos · saldo actual: ${formatearNumero(filas[0].saldo)}` : undefined)}
      columnas={[
        { clave: "creado_en", titulo: "Fecha", flex: 1.4, formato: formatearFechaHora },
        { clave: "bodega", titulo: "Bodega", flex: 1.2 },
        { clave: "tipo", titulo: "Movimiento" },
        { clave: "origen_texto", titulo: "Origen", flex: 2 },
        { clave: "usuario", titulo: "Usuario", flex: 1.4 },
        { clave: "cantidad_signo", titulo: "Cantidad", alinear: "right", formato: formatearNumero },
        { clave: "saldo", titulo: "Saldo", alinear: "right", formato: formatearNumero },
      ]}
    />
  );
}

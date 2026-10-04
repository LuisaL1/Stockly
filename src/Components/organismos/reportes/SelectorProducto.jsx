import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Selector } from "../Selector";
import { BuscarProductos } from "../../../supabase/crudProductos";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { v } from "../../../styles/variables";

export function SelectorProducto({ valor, onChange }) {
  const { dataempresa } = useEmpresaStore();
  const [texto, setTexto] = useState("");
  const { data } = useQuery({
    queryKey: ["buscar productos reporte", dataempresa?.id, texto],
    queryFn: () => BuscarProductos({ _id_empresa: dataempresa.id, buscador: texto }),
    enabled: !!dataempresa?.id,
    placeholderData: (previo) => previo,
  });

  return (
    <Selector
      opciones={data}
      valor={valor}
      onChange={onChange}
      buscable
      onBuscar={setTexto}
      icono={<v.iconostock />}
      placeholder="Selecciona un producto"
    />
  );
}

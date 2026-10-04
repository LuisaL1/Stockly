import { useState } from "react";
import { PaginaTemplate } from "./PaginaTemplate";
import { Buscador } from "../organismos/Buscador";
import { TablaKardex } from "../organismos/tablas/TablaKardex";
import { RegistrarKardex } from "../organismos/formularios/RegistrarKardex";
import { Boton } from "../atomos/Boton";
import { useKardexStore } from "../../store/KardexStore";
import { v } from "../../styles/variables";

export function KardexTemplate({ data }) {
  const [tipo, setTipo] = useState(null); // "Entrada" | "Salida"
  const { setBuscador } = useKardexStore();

  return (
    <PaginaTemplate
      titulo="Kardex"
      descripcion="Historial de entradas y salidas de inventario."
      acciones={
        <>
          <Boton variante="exito" icono={<v.flechaarribalarga />} funcion={() => setTipo("Entrada")}>
            Entrada
          </Boton>
          <Boton variante="peligro" icono={<v.flechaabajolarga />} funcion={() => setTipo("Salida")}>
            Salida
          </Boton>
        </>
      }
      herramientas={<Buscador setBuscador={setBuscador} placeholder="Buscar por producto..." />}
    >
      <TablaKardex data={data} />
      {tipo && <RegistrarKardex tipo={tipo} onClose={() => setTipo(null)} />}
    </PaginaTemplate>
  );
}

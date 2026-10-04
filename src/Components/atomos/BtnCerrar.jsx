import { AccionTabla } from "./AccionTabla";
import { v } from "../../styles/variables";

export function BtnCerrar({ funcion }) {
  return <AccionTabla funcion={funcion} icono={<v.iconocerrar />} etiqueta="Cerrar" />;
}

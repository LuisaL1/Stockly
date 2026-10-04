import { Link } from "react-router-dom";
import { EstadoVacio } from "../Components/moleculas/EstadoVacio";
import { LuSearchX } from "react-icons/lu";

export function NoEncontrado() {
  return (
    <EstadoVacio
      icono={<LuSearchX />}
      titulo="Página no encontrada"
      mensaje="La dirección que buscas no existe o fue movida."
      accion={<Link to="/">Volver al inicio</Link>}
    />
  );
}

import { ReportesTemplate } from "../Components/templatesReact/ReportesTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { MODULOS } from "../utils/permisos";

export default function Reportes() {
  return (
    <ConPermiso modulo={MODULOS.productos}>
      <ReportesTemplate />
    </ConPermiso>
  );
}

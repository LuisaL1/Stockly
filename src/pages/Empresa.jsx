import { useForm } from "react-hook-form";
import styled from "styled-components";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { InputText } from "../Components/organismos/formularios/InputText";
import { Formulario } from "../Components/organismos/formularios/Formulario";
import { Boton } from "../Components/atomos/Boton";
import { useEmpresaStore } from "../store/EmpresaStore";
import { MODULOS } from "../utils/permisos";
import { v } from "../styles/variables";
import { Sectores } from "../utils/dataEstatica";

export function Empresa() {
  return (
    <ConPermiso modulo={MODULOS.empresa}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa, EditarEmpresa } = useEmpresaStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    values: {
      nombre: dataempresa?.nombre ?? "",
      simbolomoneda: dataempresa?.simbolomoneda ?? "",
      nit: dataempresa?.nit ?? "",
      sector: dataempresa?.sector ?? "",
      ciudad: dataempresa?.ciudad ?? "",
      telefono: dataempresa?.telefono ?? "",
    },
  });

  async function guardar(data) {
    const ok = await EditarEmpresa({
      id: dataempresa.id,
      nombre: data.nombre.trim(),
      simbolomoneda: data.simbolomoneda.trim(),
      nit: data.nit.trim(),
      sector: data.sector,
      ciudad: data.ciudad.trim(),
      telefono: data.telefono.trim(),
    });
    if (ok) reset(data);
  }

  return (
    <PaginaTemplate
      titulo="Tu empresa"
      descripcion="Estos datos aparecen en el panel, los reportes y las facturas."
      volverA={{ to: "/configurar", texto: "Configuración" }}
    >
      <Tarjeta>
        <Formulario onSubmit={handleSubmit(guardar)}>
          <InputText label="Nombre de la empresa" icono={<v.iconoempresa />} error={errors.nombre?.message}>
            <input {...register("nombre", { validate: (t) => !!t?.trim() || "Escribe el nombre" })} />
          </InputText>
          <div className="grid">
            <InputText label="NIT" icono={<v.iconodocumento />}>
              <input placeholder="900123456-7" {...register("nit")} />
            </InputText>
            <InputText label="Sector" icono={<v.iconocategorias />}>
              <select {...register("sector")}>
                <option value="">Selecciona…</option>
                {Sectores.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </InputText>
            <InputText label="Ciudad" icono={<v.iconodireccion />}>
              <input {...register("ciudad")} />
            </InputText>
            <InputText label="Teléfono" icono={<v.iconotelefono />}>
              <input type="tel" {...register("telefono")} />
            </InputText>
          </div>
          <InputText
            label="Símbolo de moneda"
            icono={<v.iconoprecioventa />}
            error={errors.simbolomoneda?.message}
            ayuda="Ej. $, COP, S/, €"
          >
            <input
              maxLength={5}
              {...register("simbolomoneda", { validate: (t) => !!t?.trim() || "Escribe el símbolo" })}
            />
          </InputText>
          <div className="acciones">
            <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting} disabled={!isDirty}>
              Guardar cambios
            </Boton>
          </div>
        </Formulario>
      </Tarjeta>
    </PaginaTemplate>
  );
}

const Tarjeta = styled.div`
  max-width: 680px;
  padding: 24px;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius};
  box-shadow: ${({ theme }) => theme.shadow};
`;

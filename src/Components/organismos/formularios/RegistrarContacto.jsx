import { useForm } from "react-hook-form";
import { Modal } from "../../moleculas/Modal";
import { InputText } from "./InputText";
import { Formulario } from "./Formulario";
import { Boton } from "../../atomos/Boton";
import { useClientesStore, useProveedoresStore } from "../../../store/ContactosStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { TiposDocumento } from "../../../utils/dataEstatica";
import { v } from "../../../styles/variables";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const limpio = (t) => (t ?? "").trim() || null;

// Formulario de cliente o proveedor. onGuardado recibe los datos enviados.
export function RegistrarContacto({ tipo = "cliente", accion = "Nuevo", dataSelect = {}, onClose, onGuardado }) {
  const esCliente = tipo === "cliente";
  const editando = accion === "Editar";
  const clientes = useClientesStore();
  const proveedores = useProveedoresStore();
  const store = esCliente ? clientes : proveedores;
  const { dataempresa } = useEmpresaStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      tipo_documento: "CC",
      ...dataSelect,
    },
  });

  async function guardar(data) {
    const p = esCliente
      ? {
          nombre: data.nombre.trim(),
          tipo_documento: data.tipo_documento,
          documento: limpio(data.documento),
          email: limpio(data.email),
          telefono: limpio(data.telefono),
          direccion: limpio(data.direccion),
        }
      : {
          nombre: data.nombre.trim(),
          nit: limpio(data.nit),
          contacto: limpio(data.contacto),
          email: limpio(data.email),
          telefono: limpio(data.telefono),
          direccion: limpio(data.direccion),
        };
    const ok = editando
      ? await store.Editar({ id: dataSelect.id, ...p })
      : await store.Insertar({ ...p, id_empresa: dataempresa.id });
    if (ok) {
      onGuardado?.(p);
      onClose();
    }
  }

  const titulo = `${editando ? "Editar" : "Nuevo"} ${esCliente ? "cliente" : "proveedor"}`;

  return (
    <Modal titulo={titulo} subtitulo={editando ? dataSelect.nombre : undefined} onClose={onClose} ancho="640px">
      <Formulario onSubmit={handleSubmit(guardar)}>
        <div className="grid">
          <div className="completo">
            <InputText
              label={esCliente ? "Nombre o razón social" : "Nombre del proveedor"}
              icono={<v.icononombre />}
              error={errors.nombre?.message}
            >
              <input autoFocus {...register("nombre", { validate: (t) => !!t?.trim() || "Escribe el nombre" })} />
            </InputText>
          </div>

          {esCliente ? (
            <>
              <InputText label="Tipo de documento" icono={<v.iconodocumento />}>
                <select {...register("tipo_documento")}>
                  {TiposDocumento.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.descripcion}
                    </option>
                  ))}
                </select>
              </InputText>
              <InputText label="Número de documento" icono={<v.iconocodigointerno />} ayuda="Necesario para factura electrónica.">
                <input {...register("documento")} />
              </InputText>
            </>
          ) : (
            <>
              <InputText label="NIT" icono={<v.iconodocumento />}>
                <input {...register("nit")} />
              </InputText>
              <InputText label="Persona de contacto" icono={<v.iconoUser />}>
                <input {...register("contacto")} />
              </InputText>
            </>
          )}

          <InputText label="Correo" icono={<v.iconoemail />} error={errors.email?.message}>
            <input
              type="email"
              {...register("email", { validate: (t) => !t?.trim() || EMAIL.test(t.trim()) || "El correo no es válido" })}
            />
          </InputText>
          <InputText label="Teléfono" icono={<v.iconotelefono />}>
            <input type="tel" {...register("telefono")} />
          </InputText>
          <div className="completo">
            <InputText label="Dirección" icono={<v.iconodireccion />}>
              <input {...register("direccion")} />
            </InputText>
          </div>
        </div>
        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting}>
            Guardar
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

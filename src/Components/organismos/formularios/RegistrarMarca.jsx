import { useForm } from "react-hook-form";
import { Modal } from "../../moleculas/Modal";
import { InputText } from "./InputText";
import { Boton } from "../../atomos/Boton";
import { Formulario } from "./Formulario";
import { useMarcaStore } from "../../../store/MarcaStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { CovertirCapitalize } from "../../../utils/conversiones";
import { v } from "../../../styles/variables";

export function RegistrarMarca({ onClose, dataSelect = {}, accion }) {
  const { Insertar, Editar } = useMarcaStore();
  const { dataempresa } = useEmpresaStore();
  const editando = accion === "Editar";
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { nombre: editando ? dataSelect.descripcion : "" } });

  async function guardar({ nombre }) {
    const descripcion = CovertirCapitalize(nombre);
    const ok = editando
      ? await Editar({ id: dataSelect.id, descripcion })
      : await Insertar({ _descripcion: descripcion, _idempresa: dataempresa.id });
    if (ok) onClose();
  }

  return (
    <Modal titulo={editando ? "Editar marca" : "Nueva marca"} onClose={onClose} ancho="440px">
      <Formulario onSubmit={handleSubmit(guardar)}>
        <InputText label="Nombre de la marca" icono={<v.iconomarca />} error={errors.nombre?.message}>
          <input
            autoFocus
            placeholder="Ej. Colgate"
            {...register("nombre", { validate: (t) => !!t?.trim() || "Escribe el nombre de la marca" })}
          />
        </InputText>
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

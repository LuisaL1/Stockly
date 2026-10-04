import { useState } from "react";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { Modal } from "../../moleculas/Modal";
import { InputText } from "./InputText";
import { Boton } from "../../atomos/Boton";
import { Formulario } from "./Formulario";
import { useCategoriasStore } from "../../../store/CategoriasStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { CovertirCapitalize } from "../../../utils/conversiones";
import { v } from "../../../styles/variables";

const COLORES = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16", "#22C55E",
  "#14B8A6", "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899",
];

export function RegistrarCategorias({ onClose, dataSelect = {}, accion }) {
  const { Insertar, Editar } = useCategoriasStore();
  const { dataempresa } = useEmpresaStore();
  const editando = accion === "Editar";
  const [color, setColor] = useState(editando && dataSelect.color ? dataSelect.color : COLORES[8]);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { nombre: editando ? dataSelect.descripcion : "" } });

  async function guardar({ nombre }) {
    const descripcion = CovertirCapitalize(nombre);
    const ok = editando
      ? await Editar({ id: dataSelect.id, descripcion, color })
      : await Insertar({ _descripcion: descripcion, _idempresa: dataempresa.id, _color: color });
    if (ok) onClose();
  }

  return (
    <Modal titulo={editando ? "Editar categoría" : "Nueva categoría"} onClose={onClose} ancho="460px">
      <Formulario onSubmit={handleSubmit(guardar)}>
        <InputText label="Nombre de la categoría" icono={<v.iconocategorias />} error={errors.nombre?.message}>
          <input
            autoFocus
            placeholder="Ej. Bebidas"
            {...register("nombre", { validate: (t) => !!t?.trim() || "Escribe el nombre de la categoría" })}
          />
        </InputText>
        <div>
          <span className="etiqueta">Color</span>
          <Paleta>
            <div className="muestras" role="radiogroup" aria-label="Color">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={c.toLowerCase() === color.toLowerCase()}
                  aria-label={c}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <Vista $color={color}>{watch("nombre") || "Vista previa"}</Vista>
          </Paleta>
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

const Paleta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 10px;
  .muestras {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .muestras button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: transform 0.1s;
    &:hover {
      transform: scale(1.1);
    }
    &[aria-checked="true"] {
      box-shadow: 0 0 0 3px ${({ theme }) => theme.surface}, 0 0 0 5px currentColor;
      color: ${({ theme }) => theme.text};
    }
  }
`;

const Vista = styled.span`
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: color-mix(in srgb, ${({ $color }) => $color} 14%, transparent);
`;

import { useEffect, useState } from "react";
import styled from "styled-components";
import { v } from "../../../styles/variables";
import { InputText, Btnsave, useCategoriasStore, CovertirCapitalize } from "../../../index";
import { useForm } from "react-hook-form";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { InsertarCategorias } from "../../../supabase/crudCategorias";
import {CirclePicker} from "react-color"

export function RegistrarCategorias({ onClose, dataSelect, accion }) {
const [currentColor, setColor] = useState("#F44336");
  const { InsertarCategorias, EditarCategorias } = useCategoriasStore(); 
  const { dataempresa } = useEmpresaStore();
  
  const {
    register,
    formState: { errors },
    handleSubmit,
    setValue, 
  } = useForm();
  const elegirColor = (color) =>{
setColor(color.hex)
  }

  async function insertar(data) {
    if (accion === "Editar") {
      const p = {
        id: dataSelect.id,
        descripcion: CovertirCapitalize (data.nombre),
        color:currentColor
      };
      await EditarCategorias(p);
      onClose();
    } else {
      const p = {
        _descripcion: CovertirCapitalize (data.nombre),
        _idempresa: dataempresa.id,
        _color: currentColor
      };
      await InsertarCategorias(p);
      onClose();
    }
  }

 
  useEffect(() => {
    if (accion === "Editar" && dataSelect?.descripcion) {
      setValue("nombre", dataSelect.descripcion);
    }
  }, [accion, dataSelect, setValue]);

  return (
    <Container>
      <div className="sub-contenedor">
        <div className="headers">
          <section>
            <h1>
              {accion == "Editar" ? "Editar categoría" : "Registrar nueva categoría"}
            </h1>
          </section>

          <section>
            <span onClick={onClose}>x</span>
          </section>
        </div>

        <form className="formulario" onSubmit={handleSubmit(insertar)}>
          <section>
            <article>
              <InputText icono={<v.iconomarca />}>
                <input
                  className="form__field"
                 
                  type="text"
                  placeholder=""
                  {...register("nombre", {
                    required: true,
                  })}
                />
                <label className="form__label">categoría</label>
                {errors.nombre?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>
            <article className="colorContainer">
            <CirclePicker onChange={elegirColor}/>
            </article>
          
            <div className="btnguardarContent">
              <Btnsave
                icono={<v.iconoguardar />}
                titulo="Guardar"
                bgcolor="#ef552b"
              />
            </div>
          </section>
        </form>
      </div>
    </Container>
  );
}

const Container = styled.div`
  transition: 0.5s;
  top: 0;
  left: 0;
  position: fixed;
  background-color: rgba(10, 9, 9, 0.5);
  display: flex;
  width: 100%;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .sub-contenedor {
    width: 500px;
    max-width: 85%;
    border-radius: 20px;
    background: ${({ theme }) => theme.bgtotal};
    box-shadow: -10px 15px 30px rgba(10, 9, 9, 0.4);
    padding: 13px 36px 20px 36px;
    z-index: 100;

    .headers {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h1 {
        font-size: 20px;
        font-weight: 500;
      }
      span {
        font-size: 20px;
        cursor: pointer;
      }
    }
    .formulario {
      section {
        gap: 20px;
        display: flex;
        flex-direction: column;
        .colorContainer {
          .colorPickerContent {
            padding-top: 15px;
            min-height: 50px;
          }
        }
      }
    }
  }
`;
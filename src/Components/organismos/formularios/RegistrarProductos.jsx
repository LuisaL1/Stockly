import { useEffect, useState } from "react";
import styled from "styled-components";
import { v } from "../../../styles/variables";
import { InputText, Btnsave, useProductosStore, CovertirCapitalize, ContainerSelector, Selector, useMarcaStore, Btnfiltro, RegistrarMarca } from "../../../index";
import { useForm } from "react-hook-form";
import { AiFillProduct } from "react-icons/ai";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ListaGenerica } from "../ListaGenerica";
export function RegistrarProductos({ onClose, dataSelect, accion }) {
  const { insertarProductos, EditarProductos } = useProductosStore(); 
  const { dataempresa } = useEmpresaStore();
  const {marcaItemSelect, datamarca, selectMarca} = useMarcaStore()
  const [stateMarca, setStateMarca] = useState(false);
  const [openRegistroMarca, SetopenRegistroMarca] = useState(false);
  const [subaccion, setAccion] = useState ("");
  const nuevoRegistroMarca=()=>{
    SetopenRegistroMarca(!openRegistroMarca)
    setAccion("Nuevo")

  }

  const {
    register,
    formState: { errors },
    handleSubmit,
    setValue
  } = useForm();

  async function insertar(data) {
    if (accion === "Editar") {
      const p = {
        id: dataSelect.id,
        descripcion: CovertirCapitalize (data.nombre),
      };
      await EditarProductos(p);
      onClose();
    } else {
      const p = {
        _descripcion: CovertirCapitalize (data.nombre),
        _idempresa: dataempresa.id,
      };
      await insertarProductos(p);
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
              {accion == "Editar" ? "Editar productos" : "Registrar nuevos productos"}
            </h1>
          </section>

          <section>
            <span onClick={onClose}>x</span>
          </section>
        </div>

        <form className="formulario" onSubmit={handleSubmit(insertar)}>
          <section>
            <article>
              <InputText icono={<v.icononombre />}>
                <input
                  className="form__field"
                 
                  type="text"
                  placeholder=""
                  {...register("nombre", {
                    required: true,
                  })}
                />
                <label className="form__label">descripcion</label>
                {errors.nombre?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>
            <ContainerSelector>
              <label>Marca: </label>
              <Selector funcion={()=>setStateMarca(!stateMarca)}
              state={stateMarca}
              color ="#fc6027" texto1={<AiFillProduct />} texto2=
              {marcaItemSelect?.descripcion}/>

              {stateMarca && (<ListaGenerica bottom="-260px"
              funcion={selectMarca}
              setState={()=>setStateMarca(!stateMarca)}
              scroll="scroll" data={datamarca}/>)}
              <Btnfiltro bgcolor="#f6f3f3" funcion={nuevoRegistroMarca}
              textcolor="#353535" icono={<v.agregar/>}/>
            </ContainerSelector>
            <article>
              <InputText icono={<v.iconostock />}>
                <input
                  className="form__field"
                 
                  type="number"
                  step="0"
                  placeholder=""
                  defaultValue={dataSelect.stock}
                  {...register("stock", {
                    required: true,
                  })}
                />
                <label className="form__label">stock</label>
                {errors.stock?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>
                        <article>
              <InputText icono={<v.iconostockminimo />}>
                <input
                  className="form__field"
                 
                  type="number"
                  step="0"
                  placeholder=""
                  defaultValue={dataSelect.stock_minimo}
                  {...register("stockminimo", {
                    required: true,
                  })}
                />
                <label className="form__label">stock mínimo</label>
                {errors.stockminimo?.type === "required" && <p>Campo requerido</p>}
              </InputText>
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
        {
          openRegistroMarca && (<RegistrarMarca accion={subaccion}
            onClose={()=>SetopenRegistroMarca(!openRegistroMarca)}
           dataSelect={dataSelect}/>)
        }
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
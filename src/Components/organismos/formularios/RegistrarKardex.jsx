import { useEffect, useState } from "react";
import styled from "styled-components";
import { v } from "../../../styles/variables";
import { InputText, Btnsave, useKardexStore, CovertirCapitalize, Buscador, useProductosStore, CardProductoSelect, useUsuariosStore } from "../../../index";
import { useForm } from "react-hook-form";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ListaGenerica } from "../ListaGenerica";

export function RegistrarKardex({ onClose, dataSelect, accion, tipo }) {
  const [stateListaProd, SetstateListaProd] = useState(false);
  const { InsertarKardex } = useKardexStore(); 
  const { dataempresa } = useEmpresaStore();
  const {idusuario} = useUsuariosStore();
  const {dataproductos, setBuscador, selectProductos, productosItemSelect} = useProductosStore();
  
  const {
    register,
    formState: { errors },
    handleSubmit,
    setValue, 
  } = useForm();

  async function insertar(data) {

      const p = {
        fecha: new Date(),
        tipo: tipo,
        id_usuario: idusuario,
        cantidad: parseFloat(data.cantidad),
        detalle: data.detalle,
        id_empresa: dataempresa.id,
        id_producto: productosItemSelect.id
      };
      await InsertarKardex(p);
      onClose();
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
          Nueva {tipo == "Entrada" ? "entrada" : "salida"}
            </h1>
          </section>

          <section>
            <span onClick={onClose}>x</span>
          </section>
        </div>
        <div className="contentBuscador">
          <div onClick={()=>SetstateListaProd(!stateListaProd)}>
            <Buscador setBuscador={setBuscador}/>
          </div>
          {
            stateListaProd && (
              <ListaGenerica scroll="scroll" bottom="-250px" data={dataproductos} 
              setState={()=>SetstateListaProd(!stateListaProd)}
              funcion={selectProductos}/>
              
            )
          }
        </div>
        <CardProductoSelect text1={productosItemSelect.descripcion} text2={productosItemSelect.stock}/>

        <form className="formulario" onSubmit={handleSubmit(insertar)}>
          <section>
            <article>
              <InputText icono={<v.iconocalculadora />}>
                <input
                  className="form__field"
                 
                  type="number"
                  placeholder=""
                  {...register("cantidad", {
                    required: true,
                  })}
                />
                <label className="form__label">cantidad</label>
                {errors.cantidad?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>
            <article>
              <InputText icono={<v.iconotodos />}>
                <input
                  className="form__field"
                 
                  type="text"
                  placeholder=""
                  {...register("detalle", {
                    required: true,
                  })}
                />
                <label className="form__label">detalle</label>
                {errors.detalle?.type === "required" && <p>Campo requerido</p>}
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
.contentBuscador{
  position:relative;
}
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
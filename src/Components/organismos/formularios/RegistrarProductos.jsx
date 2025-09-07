import { useEffect, useState } from "react";
import styled from "styled-components";
import { v } from "../../../styles/variables";

import {
  InputText,
  Btnsave,
  useProductosStore,
  CovertirCapitalize,
  ContainerSelector,
  Selector,
  useMarcaStore,
  Btnfiltro,
  RegistrarMarca,
  useCategoriasStore,
  RegistrarCategorias,
  Device
} from "../../../index";
import { useForm } from "react-hook-form";
import { BsBagHeartFill } from "react-icons/bs";
import { AiFillProduct } from "react-icons/ai";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ListaGenerica } from "../ListaGenerica";

export function RegistrarProductos({ onClose, dataSelect, accion }) {
  const { insertarProductos, EditarProductos } = useProductosStore();
  const { dataempresa } = useEmpresaStore();
  const { categoriasItemSelect, datacategorias, selectCategoria } = useCategoriasStore();
  const { marcaItemSelect, datamarca, selectMarca } = useMarcaStore();

  const [stateMarca, setStateMarca] = useState(false);
  const [stateCategoria, setStateCategoria] = useState(false);
  const [openRegistroMarca, SetopenRegistroMarca] = useState(false);
  const [openRegistroCategoria, SetopenRegistroCategoria] = useState(false);
  const [subaccion, setAccion] = useState("");

  const nuevoRegistroMarca = () => {
    SetopenRegistroMarca(!openRegistroMarca);
    setAccion("Nuevo");
  };

  const nuevoRegistroCategoria = () => {
    SetopenRegistroCategoria(!openRegistroCategoria);
    setAccion("Nuevo");
  };

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
        descripcion: CovertirCapitalize(data.descripcion),
        idmarca: marcaItemSelect.id,
        stock: parseFloat(data.stock),
        stock_minimo: parseFloat(data.stockminimo),
        codigobarras: parseFloat(data.codigobarras),
        codigointerno: data.codigointerno,
        precioventa: parseFloat(data.precioventa),
        preciocompra: parseFloat(data.preciocompra),
        id_categoria: categoriasItemSelect.id,
        id_empresa: dataempresa.id,

      };
      await EditarProductos(p);
      onClose();
    } else {
      const p = {
        _descripcion: CovertirCapitalize(data.descripcion),
        _idmarca: marcaItemSelect.id,
        _stock: parseFloat(data.stock),
        _stock_minimo: parseFloat(data.stockminimo),
        _codigobarras: parseFloat(data.codigobarras),
        _codigointerno: data.codigointerno,
        _precioventa: parseFloat(data.precioventa),
        _preciocompra: parseFloat(data.preciocompra),
        _id_categoria: categoriasItemSelect.id,
        _id_empresa: dataempresa.id,
      };
      await insertarProductos(p);
      onClose();
    }
  }

useEffect(() => {
  if (accion === "Editar") {
    selectMarca({id:dataSelect.idmarca,descripcion:dataSelect.marca})
    selectCategoria({id:dataSelect.id_categoria,descripcion:dataSelect.categoria})
  }
}, []); 

  return (
    <Container>
      <div className="sub-contenedor">
        <div className="headers">
          <section>
            <h1>
              {accion === "Editar" ? "Editar productos" : "Registrar nuevos productos"}
            </h1>
          </section>

          <section>
            <span onClick={onClose}>x</span>
          </section>
        </div>
        <form className="formulario" onSubmit={handleSubmit(insertar)}>
          <section className="seccion1">
            
            <article>
              <InputText icono={<v.icononombre />}>
                <input
                  className="form__field"
                  defaultValue={dataSelect.descripcion}
                  type="text"
                  placeholder=""
                  {...register("descripcion", {
                    required: true,
                  })}
                />
                <label className="form__label">descripción</label>
                {errors.nombre?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>      
            <ContainerSelector>
              <label>Marca: </label>
              <Selector
                funcion={() => setStateMarca(!stateMarca)}
                state={stateMarca}
                color="#fc6027"
                texto1={<BsBagHeartFill />}
                texto2={marcaItemSelect?.descripcion}
              />

              {stateMarca && (
                <ListaGenerica
                  bottom="-260px"
                  funcion={selectMarca}
                  setState={() => setStateMarca(!stateMarca)}
                  scroll="scroll"
                  data={datamarca}
                  icono={<BsBagHeartFill />}   
                />
              )}

              <Btnfiltro
                bgcolor="#f6f3f3"
                funcion={nuevoRegistroMarca}
                textcolor="#353535"
                icono={<v.agregar />}
              />
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

           
            <ContainerSelector>
              <label>Categoría: </label>
              <Selector
                funcion={() => setStateCategoria(!stateCategoria)}
                state={stateCategoria}
                color="#fc6027"
                texto1={<AiFillProduct />}
                texto2={categoriasItemSelect?.descripcion}
              />

              {stateCategoria && (
                <ListaGenerica
                  bottom="-260px"
                  funcion={selectCategoria}
                  setState={() => setStateCategoria(!stateCategoria)}
                  scroll="scroll"
                  data={datacategorias}
                  icono={<AiFillProduct />}   
                />
              )}

              <Btnfiltro
                bgcolor="#f6f3f3"
                funcion={nuevoRegistroCategoria}
                textcolor="#353535"
                icono={<v.agregar />}
              />
            </ContainerSelector>
          </section>
          <section className="seccion2">
            <article>
             <InputText icono={<v.iconocodigobarras />}>
                <input
                  className="form__field"
                  defaultValue={dataSelect.codigobarras}
                  type="number"
                  placeholder=""
                  {...register("codigobarras", {
                    required: true,
                  })}
                />
                <label className="form__label">codigo de barras</label>
                {errors.codigobarras?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>
            <article>
              <InputText icono={<v.iconocodigointerno />}>
                <input
                  className="form__field"
                  defaultValue={dataSelect.codigointerno}
                  type="text"
                  placeholder=""
                  {...register("codigointerno", {
                    required: true,
                  })}
                />
                <label className="form__label">codigo interno</label>
                {errors.codigointerno?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>       
            <article>
              <InputText icono={<v.iconoprecioventa />}>
                <input
                  step="0.01"
                  className="form__field"
                  defaultValue={dataSelect.precioventa}
                  type="number"
                  placeholder=""
                  {...register("precioventa", {
                    required: true,
                  })}
                />
                <label className="form__label">precio de venta</label>
                {errors.precioventa?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article> 
            <article>
              <InputText icono={<v.iconopreciocompra />}>
                <input
                  step="0.01"
                  className="form__field"
                  defaultValue={dataSelect.preciocompra}
                  type="number"
                  placeholder=""
                  {...register("preciocompra", {
                    required: true,
                  })}
                />
                <label className="form__label">precio de compra</label>
                {errors.preciocompra?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>   
              
          </section>
            <div className="btnguardarContent">
              <Btnsave
                icono={<v.iconoguardar />}
                titulo="Guardar"
                bgcolor="#ef552b"
              />
            </div>
        </form> 
        {openRegistroMarca && (
          <RegistrarMarca
            accion={subaccion}
            onClose={() => SetopenRegistroMarca(!openRegistroMarca)}
            dataSelect={dataSelect}
          />
        )}
        {openRegistroCategoria && (
          <RegistrarCategorias
            accion={subaccion}
            onClose={() => SetopenRegistroCategoria(!openRegistroCategoria)}
            dataSelect={dataSelect}
          />
        )}
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
    width: 90%;
    max-width: 90%;
    border-radius: 20px;
    background: ${({ theme }) => theme.bgtotal};
    box-shadow: -10px 15px 30px rgba(10, 9, 9, 0.4);
    padding: 13px 36px 20px 36px;
    z-index: 100;
    height: 90vh;
    overflow-y: auto;
    overflow-x: hidden;
    &::-webkit-scrollbar{
      width:6px;
      border-radius: 10px;
    }
    &::-webkit-scrollbar-thumb{
    background-color: #484848;
    border-radius: 10px;
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
      display: grid;
      grid-template-columns: 1fr;
      gap: 15px;
      align-items: start;
      @media ${Device.tablet}{
        grid-template-columns: repeat(2, 1fr);
      }
      section {
        gap: 20px;
        display: flex;
        flex-direction: column;
      }
      .btnguardarContent{
        display: flex;
        justify-content: end;
        grid-column: 1;
        @media ${Device.tablet}{
          grid-column: 2;
        }
      }
    }
  }
`;
import { useEffect, useState } from "react";
import styled from "styled-components";
import { v } from "../../../styles/variables";
import { IoPerson } from "react-icons/io5";
import { FaUnlockKeyhole } from "react-icons/fa6";
import {
  InputText,
  Btnsave,
  CovertirCapitalize,
  ContainerSelector,
  Selector,
  Device,
  TipouserData,
  ListaModulos,
  useUsuariosStore
} from "../../../index";
import { useForm } from "react-hook-form";
import { BsBagHeartFill } from "react-icons/bs";
import { AiFillProduct } from "react-icons/ai";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { ListaGenerica } from "../ListaGenerica";
import { useQuery } from "@tanstack/react-query";

export function RegistrarUsuarios({ onClose, dataSelect, accion }) {
  const { isLoading } = useQuery({
  queryKey: ["mostrar permisos edit", { id_usuario: dataSelect?.id }],
  queryFn: () => MostrarPermisosEdit({ id_usuario: dataSelect.id }),
  enabled: !!dataSelect?.id, // solo corre si hay id_usuario
});

  const {dataempresa,} = useEmpresaStore();
  const [checkboxs, setcheckboxs] = useState([]);
  const [tipouser, setTipouser] = useState({
    icono: "",
    descripcion: "empleado"
  })
  const {insertarUsuarios,MostrarPermisosEdit, EditarUsuarios, selectUsuarios } = useUsuariosStore();
  const [stateTipouser, setStateTipouser] = useState(false);
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
  } = useForm();

  async function insertar(data) {
    if (accion === "Editar") {
      const p = {
            id: dataSelect.id,
            nombres: data.nombres,
            email: data.email,
            nro_docum: data.nrdoc,
            telefono: data.telefono,
            direccion: data.direccion,
            tipouser: tipouser.descripcion
            
      };
      await EditarUsuarios(p, checkboxs, dataempresa.id);
      onClose();
    } else {
      const p = {
            nombres: data.nombres,
            email: data.email,
            nro_docum: data.nrdoc,
            telefono: data.telefono,
            direccion: data.direccion,
            tipouser: tipouser.descripcion,
            id_empresa: dataempresa.id
            
      };
      const parametrosAuth = {
        email:data.email,
        pass:data.pass
      }
      await insertarUsuarios(parametrosAuth, p , checkboxs);
      onClose();
    }
  }

useEffect(() => {
  if (accion === "Editar") {
    setTipouser({icono:"",descripcion:dataSelect.tipouser})
  }
}, []); 
if (isLoading)
{
  return <span>Cargando...</span>
}  
return (
    <Container>
      <div className="sub-contenedor">
        <div className="headers">
          <section>
            <h1>
              {accion === "Editar" ? "Editar usuario" : "Registrar nuevo usuario"}
            </h1>
          </section>

          <section>
            <span onClick={onClose}>x</span>
          </section>
        </div>
        <form className="formulario" onSubmit={handleSubmit(insertar)}>
          <section className="seccion1">
              {
                accion!="Editar"?(<article>
              <InputText icono={<v.icononombre />}>
                <input 
                  className={accion === "Editar" ? "form__field disabled" : "form__field"}
                  defaultValue={dataSelect.email}
                  type="text"
                  placeholder=""
                  {...register("email", {
                    required: true,
                  })}
                />
                <label className="form__label">correo</label>
                {errors.email?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>):(<span className="form__field disabled">{dataSelect.email}</span>)
              }
  
            {
              accion!="Editar"?(            <article>
              <InputText icono={<v.icononombre />}>
                <input
                  className="form__field"
                  defaultValue={dataSelect.pass}
                  type="text"
                  placeholder=""
                  {...register("pass", {
                    required: true, minLenght: 8
                  })}
                />
                <label className="form__label">contraseña</label>
                {errors.pass?.type === "required" && <p>Campo requerido</p>}
                {errors.pass?.type === "minLenght" && <p>Debe tener al menos 8 caracteres</p>}
              </InputText>
            </article> ):(null)
            } 

            <article>
              <InputText icono={<v.icononombre />}>
                <input
                  className="form__field"
                  defaultValue={dataSelect.nombres}
                  type="text"
                  placeholder=""
                  {...register("nombres", {
                    required: true,
                  })}
                />
                <label className="form__label">nombres</label>
                {errors.nombres?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>                   
            <article>
              <InputText icono={<v.icononombre />}>
                <input
                  className="form__field"
                  defaultValue={dataSelect.nro_docum}
                  type="text"
                  placeholder=""
                  {...register("nrdoc", {
                    required: true,
                  })}
                />
                <label className="form__label">nro. documento</label>
                {errors.nrdoc?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>
            <article>
              <InputText icono={<v.icononombre />}>
                <input
                  className="form__field"
                  defaultValue={dataSelect.telefono}
                  type="text"
                  placeholder=""
                  {...register("telefono", {
                    required: true,
                  })}
                />
                <label className="form__label">teléfono</label>
                {errors.telefono?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>  
            <article>
              <InputText icono={<v.icononombre />}>
                <input
                  className="form__field"
                  defaultValue={dataSelect.direccion}
                  type="text"
                  placeholder=""
                  {...register("direccion", {
                    required: true,
                  })}
                />
                <label className="form__label">dirección</label>
                {errors.direccion?.type === "required" && <p>Campo requerido</p>}
              </InputText>
            </article>  
          </section>
          <section className="seccion2">
            <ContainerSelector>
              <label>Tipo: </label>
              <Selector color="#fc6027" 
              texto1={<IoPerson />} 
              texto2={tipouser.descripcion} funcion ={()=>setStateTipouser
              (!stateTipouser)}
              />
              {
                stateTipouser && (
                  <ListaGenerica data={TipouserData}
                  funcion={(p)=>setTipouser(p)}
                  bottom="-150px"
                  setState={()=>setStateTipouser(!stateTipouser)}/>
                )
              }
            </ContainerSelector>    
            <span>PERMISOS {<FaUnlockKeyhole />}</span> 
            <ListaModulos 
            accion ={accion}
            checkboxs={checkboxs}
            setcheckboxs={setcheckboxs}/>
            
          </section>
            <div className="btnguardarContent">
              <Btnsave
                icono={<v.iconoguardar />}
                titulo="Guardar"
                bgcolor="#ef552b"
              />
            </div>
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
    .form__field {
    font-family: inherit;
    width: 100%;
    border: none;
    border-bottom: 2px solid #9b9b9b;
    outline: 0;
    font-size: 17px;
    color: ${(props)=>props.theme.text};
    padding: 7px 0;
    background: transparent;
    transition: border-color 0.2s;
    &.disabled{
      color: #696969;
      background: #2d2d2d;
      border-radius:8px;
      margin-top:8px;
      border-bottom: 1px dashed #656565;
    }
  }

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
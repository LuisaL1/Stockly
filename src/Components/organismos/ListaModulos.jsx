import styled from "styled-components";
import { useUsuariosStore } from "../../store/UsuariosStore";
import { useEffect, useState } from "react";

export function ListaModulos({ checkboxs, setcheckboxs, accion }) {
  const { datamodulos, datapermisosEdit } = useUsuariosStore();
  const [isChecked, setisChecked] = useState(true);

  useEffect(() => {
    if (accion === "Editar") {
      let allDocs = [];
      datamodulos.map((element)=>{
        const statePermiso=datapermisosEdit?.some((objeto)=>objeto.modulos.nombre.includes(element.nombre))
        if(statePermiso){
            allDocs.push({...element,check: true})
        } else{
            allDocs.push({...element, check: false})
        }
        
      })
      setcheckboxs(allDocs)


    } else {
      setcheckboxs(datamodulos);
    }
  }, [datapermisosEdit]);

  const handlecheckbox = (id) => {
    setcheckboxs((prev) =>
      prev?.map((item) =>
        item.id === id ? { ...item, check: !item.check } : { ...item }
      )
    );
  };

  const seleccionar = (e) => {
    let check = e.target.checked;
    setisChecked(check);
    console.log(check);
  };

  return (
    <Container>
      {checkboxs?.map((item, index) => (
        <Row key={index}>
          <Cntr>
            <HiddenCheckbox
              id={`cbx-${item.id}`}
              checked={item.check}
              onChange={(e) => {
                seleccionar(e);
                handlecheckbox(item.id);
              }}
            />
            <Cbx htmlFor={`cbx-${item.id}`} />
          </Cntr>
          <LabelText htmlFor={`cbx-${item.id}`}>{item.nombre}</LabelText>
        </Row>
      ))}
    </Container>
  );
}



const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
`;

const Cntr = styled.div`
  position: relative;
  display: inline-block;
`;

const HiddenCheckbox = styled.input.attrs({ type: "checkbox" })`
  display: none !important;
`;

const Cbx = styled.label`
  position: relative;
  top: 1px;
  width: 27px;
  height: 27px;
  border: 1px solid #c8ccd4;
  border-radius: 3px;
  vertical-align: middle;
  transition: background 0.1s ease;
  cursor: pointer;
  display: block;

  &:after {
    content: "";
    position: absolute;
    top: 2px;
    left: 8px;
    width: 7px;
    height: 14px;
    opacity: 0;
    transform: rotate(45deg) scale(0);
    border-right: 2px solid #fff;
    border-bottom: 2px solid #fff;
    transition: all 0.3s ease;
    transition-delay: 0.15s;
  }

  ${HiddenCheckbox}:checked + & {
    border-color: transparent;
    background: #f6a92dff;
    animation: jelly 0.6s ease;
  }

  ${HiddenCheckbox}:checked + &:after {
    opacity: 1;
    transform: rotate(45deg) scale(1);
  }

  @keyframes jelly {
    from {
      transform: scale(1, 1);
    }
    30% {
      transform: scale(1.25, 0.75);
    }
    40% {
      transform: scale(0.75, 1.25);
    }
    50% {
      transform: scale(1.15, 0.85);
    }
    65% {
      transform: scale(0.95, 1.05);
    }
    75% {
      transform: scale(1.05, 0.95);
    }
    to {
      transform: scale(1, 1);
    }
  }
`;

const LabelText = styled.label`
  margin-left: 8px;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
`;


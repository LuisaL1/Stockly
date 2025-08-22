import styled from "styled-components";
import { useState } from "react";
import { Header, TablaMarca, RegistrarMarca, Btnfiltro, ContentFiltro, Title, v
    ,Buscador,
    useMarcaStore
 } from '../../index'

export function MarcaTemplate({data}){
    const [state, setState] = useState(false);
    const [dataSelect, setdataSelect] = useState([]);
    const [accion, setAccion] = useState("");
    const [openRegistro, SetopenRegistro] = useState(false);
    const nuevoRegistro = () => {
        SetopenRegistro(!openRegistro);
        setAccion("Nuevo");
        setdataSelect([]);
    }
    const {setBuscador} = useMarcaStore()
    return(
    <Container>
        {
            openRegistro && <RegistrarMarca 
                dataSelect={dataSelect}
                accion={accion} 
                onClose={() => SetopenRegistro(!openRegistro)}
            />
        }               
        <header className="header">
            <Header
                stateConfig={{
                    state: state, 
                    setState: () => setState(!state)
                }}
            />
        </header>
        <section className="area1">
            <ContentFiltro>
                <Title>
                    Marcas
                </Title>
                <Btnfiltro 
                    funcion={nuevoRegistro}
                    bgcolor="#f6f3f3"
                    textcolor="#353535"
                    icono={<v.agregar/>}
                />
            </ContentFiltro>                   
        </section>
        <section className="area2">
            <Buscador setBuscador={setBuscador}/>
        </section>
        <section className="main">
            <TablaMarca 
                data={data} 
                SetopenRegistro={SetopenRegistro}
                setdataSelect={setdataSelect} 
                setAccion={setAccion}
            />
        </section>
    </Container>
    );
}

const Container = styled.div`
  height: 100vh;
  width: 100%;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  display: grid;
  padding: 15px;

  grid-template-areas:
    "header"
    "area1"
    "area2"
    "main";

  grid-template-rows: 100px 100px 100px auto;

  .header {
    grid-area: header;
    display: flex;
    align-items: center;
  }

  .area1 {
    grid-area: area1;
    display: flex;
    align-items: center;
  }

  .area2 {
    grid-area: area2;
    display: flex;
    align-items: center;
    justify-content: end;
  }

  .main {
    grid-area: main;
  }
`;
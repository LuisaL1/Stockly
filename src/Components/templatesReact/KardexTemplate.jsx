import styled from "styled-components";
import { useState } from "react";
import { Header, ContentFiltro, Title, v
    ,Buscador,
    useMarcaStore,
    Btnsave, 
    Tabs,
    RegistrarKardex,
    useKardexStore
 } from '../../index'

export function KardexTemplate({data}){
    
    const [state, setState] = useState(false);
    const [dataSelect, setdataSelect] = useState([]);
    const [accion] = useState("");
    const [tipo, setTipo] = useState("");
    const [openRegistro, SetopenRegistro] = useState(false);

    const nuevaentrada = () => {
        SetopenRegistro(true);
        setTipo("Entrada")
    }
    const nuevasalida = () => {
        SetopenRegistro(true);
        setTipo("Salida")
    }
    const {setBuscador} = useKardexStore()
    return(
    <Container>
        {
            openRegistro && <RegistrarKardex tipo={tipo}
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
                    Kardex
                </Title>
               <Btnsave bgcolor="#52de65" titulo="Entradas" funcion={nuevaentrada}/>
               <Btnsave bgcolor="#fb6661" titulo="Salidas" funcion={nuevasalida}/>
            </ContentFiltro>                   
        </section>
        <section className="area2">
            <Buscador setBuscador={setBuscador}/>
        </section>
        <section className="main">
            <Tabs 
            data={data}
            
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
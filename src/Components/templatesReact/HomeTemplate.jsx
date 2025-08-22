import { TbContainer } from "react-icons/tb";
import styled from "styled-components";
import { Btnsave, useAuthStore, useEmpresaStore } from "../../index";
import { useState } from "react";
import {Header, Title} from '../../index'
import { BannerEmpresa } from "../organismos/BannerEmpresa";
export function HomeTemplate(){
    const [state,setState] =useState(false);
    
    return(<Container>
        <header className="header">
            <Header
            stateConfig={{state: state, setState:() => setState
                (!state)
            }}
            />
        </header>
        <section className="area1">   
           <Title>
            Tu empresa
           </Title>
        </section>
        <section className="main">
          <BannerEmpresa/>
        </section>
    </Container>);
}
const Container = styled.div`
  position: relative;
  overflow: hidden;
  height: 100vh;
  width: 100%;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  display: grid;
  padding: 15px;

  grid-template-areas:
    "header"
    "area1"
    "main";

  grid-template-rows: 100px 100px auto;

  .header {
    grid-area: header;
    display: flex;
    align-items: center;
  }

  .area1 {
    grid-area: area1;
    display: flex;
    align-items: center;
    justify-content: end;
  }

  .main {
    grid-area: main;
  }
`;


import { TbContainer } from "react-icons/tb";
import styled from "styled-components";
import { Btnsave, useAuthStore } from "../../index";
import { useState } from "react";
import {Header} from '../../index'
export function PlantillaBase(){
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
        </section>
        <section className="area2">

        </section>
        <section className="main">

        </section>
    </Container>);
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
  }

  .main {
    grid-area: main;
  }
`;

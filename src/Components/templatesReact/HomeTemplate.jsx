import { TbContainer } from "react-icons/tb";
import styled from "styled-components";
import { Btnsave, useAuthStore, useEmpresaStore } from "../../index";
import { useState } from "react";
import { Header, Title } from '../../index';
import { BannerEmpresa } from "../organismos/BannerEmpresa";

export function HomeTemplate() {
  const [state, setState] = useState(false);

  return (
    <Container>
      <header className="header">
        <Header
          stateConfig={{
            state: state,
            setState: () => setState(!state)
          }}
        />
      </header>

      <section className="area1">
        <Title>¡Bienvenido!</Title>
      </section>

      <section className="main">
        <BannerEmpresa />
      </section>
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  overflow-x: hidden; /* evita scroll horizontal */
  min-height: 100vh;
  width: 100%;
  background-color: ${({ theme }) => theme.bgtotal};
  color: ${({ theme }) => theme.text};
  display: grid;
  padding: 2vw;

  grid-template-areas:
    "header"
    "area1"
    "main";

  grid-template-rows: minmax(80px, auto) minmax(80px, auto) 1fr;

  .header {
    grid-area: header;
    display: flex;
    align-items: center;
    padding: 0 1vw;
  }

  .area1 {
    grid-area: area1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 1vw;

    @media (max-width: 768px) {
      justify-content: center; /* centra el título en móviles */
      text-align: center;
    }
  }

  .main {
    grid-area: main;
    width: 100%;
    overflow-x: hidden;

    & > * {
      max-width: 100%;
      width: 100%;
    }
  }
`;
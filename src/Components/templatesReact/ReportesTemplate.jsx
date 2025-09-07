import styled from "styled-components";
import { NavLink, Outlet } from "react-router-dom";
import fondo from "../../assets/reportesStockly.png";

export function ReportesTemplate() {
  return (
    <Container>
        <PageContainer>
            <Content>
                <Outlet/>
            </Content>
            <Sidebar>
                <SidebarSection>
                  <SidebarTitle>Stock Actual</SidebarTitle>
                  <SidebarItem to="stock-actual-por-producto">Por producto</SidebarItem>
                  <SidebarItem to="stock-actual-todos">Todos</SidebarItem>
                  <SidebarItem to="stock-bajo-minimo">Bajo del mínimo</SidebarItem>
                </SidebarSection>
                <SidebarSection>
                  <SidebarTitle>Entradas y salidas</SidebarTitle>
                  <SidebarItem to ="kardex-entradas-salidas">Por producto</SidebarItem>
                </SidebarSection>
                <SidebarSection>
                  <SidebarTitle>Valorizado</SidebarTitle>
                  <SidebarItem to="inventario-valorado">Todos</SidebarItem>
                </SidebarSection>
            </Sidebar>
        </PageContainer>
    </Container>
  );
}

const Container = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  padding: 15px;
  color: ${({ theme }) => theme.text};

  /* Fondo adaptable */
  background-image: url(${fondo});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: flex-start;

  /* Overlay semitransparente */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.3); /* negro 30% */
    z-index: 0;
  }
`;

const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    max-width: 1200px;
    justify-content: center;
    align-items: center; /* centra las cards horizontalmente */
    width: 100%;
    position: relative;
    z-index: 1;

    @media(min-width: 768px){
        flex-direction: row;
        align-items: flex-start; /* alinea al top en desktop */
    }
`;

const Content = styled.div`
    padding: 20px;
    border-radius: 8px;
    margin: 20px;
    flex: 1;
`;

const Sidebar = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center; /* centra las cards dentro del sidebar */

  @media (min-width: 768px) {
    width: 250px;
    order: 2;
    align-items: flex-start; /* alinea al inicio en escritorio */
  }
`;

const SidebarSection = styled.div`
  margin-bottom: 20px;
  border-radius: 10px;
  border: 2px solid #ffffff; /* borde blanco fijo */
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center; /* centra el contenido dentro de la card */
  text-align: center;  /* centra el texto */
  box-shadow: 0 4px 6px rgba(0,0,0,0.1); /* sombra suave */
  color: #ffffff;

  /* Fondo oscuro semitransparente para destacar sobre el fondo */
  background-color: rgba(47, 41, 41, 0.85);
`;

const SidebarTitle = styled.div`
  margin-bottom: 15px;
  font-size: 1.2em;
  font-weight: 600;
`;

const SidebarItem = styled(NavLink)`
    display: flex;
    justify-content: center; /* centra el texto dentro del item */
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    cursor: pointer;
    margin: 5px 0;
    text-decoration: none;
    color: #ffffff;
    width: 100%; /* que tome todo el ancho de la card */
    font-weight: 500;

    &:hover{
        color: ${(props) => props.theme.colorSubtitle};
    }

    &.active{
        background: ${(props)=> props.theme.bg6};
        border: 2px solid ${(props)=> props.theme.bg5};
        color: ${(props)=> props.theme.color1};
        font-weight: 600;
    }
`;

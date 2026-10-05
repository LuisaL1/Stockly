import { useEffect, useState } from "react";
import styled from "styled-components";
import { useLocation } from "react-router-dom";
import { LuMenu } from "react-icons/lu";
import { Sidebar } from "./sidebar/Sidebar";
import { CampanaNotificaciones } from "./CampanaNotificaciones";
import { BotonSoporte } from "./BotonSoporte";
import { useNovandraStore } from "../../store/NovandraStore";
import { v } from "../../styles/variables";

// Barra superior para móvil con un cajón de navegación.
export function MenuHambur() {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  const abrirNovandra = useNovandraStore((s) => s.abrir);

  useEffect(() => setAbierto(false), [pathname]);

  return (
    <>
      <Barra>
        <button type="button" onClick={() => setAbierto(true)} aria-label="Abrir menú">
          <LuMenu />
        </button>
        <span className="marca">
          <img src={v.logo} alt="" />
          Stockly
        </span>
        <button type="button" className="novandra" onClick={() => abrirNovandra()} aria-label="Abrir Novandra">
          <v.icononovandra />
        </button>
        <BotonSoporte />
        <CampanaNotificaciones />
      </Barra>
      {abierto && (
        <Cajon onMouseDown={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <Sidebar movil onNavegar={() => setAbierto(false)} />
        </Cajon>
      )}
    </>
  );
}

const Barra = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 60px;
  padding: 0 16px;
  background: ${({ theme }) => theme.surface};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  > button {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: ${({ theme }) => theme.radiusSm};
    background: transparent;
    font-size: 24px;
    cursor: pointer;
    &:hover {
      background: ${({ theme }) => theme.surfaceAlt};
    }
  }
  .novandra {
    color: ${({ theme }) => theme.primary};
    font-size: 20px;
  }
  .marca {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    img {
      width: 28px;
    }
  }
`;

const Cajon = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: ${({ theme }) => theme.overlay};
  animation: aparecer 0.15s ease-out;
  > aside {
    animation: deslizar 0.2s ease-out;
    box-shadow: ${({ theme }) => theme.shadowLg};
  }
  @keyframes aparecer {
    from {
      opacity: 0;
    }
  }
  @keyframes deslizar {
    from {
      transform: translateX(-100%);
    }
  }
`;

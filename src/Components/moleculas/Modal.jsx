import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { BtnCerrar } from "../atomos/BtnCerrar";

// Pila de modales abiertos: Esc solo cierra el que está encima.
const pila = [];

export function Modal({ titulo, subtitulo, onClose, children, ancho = "520px", pie }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const token = {};
    pila.push(token);
    const cerrarConEsc = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented && pila.at(-1) === token) onCloseRef.current?.();
    };
    document.addEventListener("keydown", cerrarConEsc);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      pila.splice(pila.indexOf(token), 1);
      document.removeEventListener("keydown", cerrarConEsc);
      document.body.style.overflow = overflowPrevio;
    };
  }, []);

  return createPortal(
    <Overlay onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <Dialogo role="dialog" aria-modal="true" aria-label={titulo} $ancho={ancho}>
        <header>
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <BtnCerrar funcion={onClose} />
        </header>
        <div className="cuerpo">{children}</div>
        {pie && <footer>{pie}</footer>}
      </Dialogo>
    </Overlay>,
    document.body
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: ${({ theme }) => theme.overlay};
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: aparecer 0.15s ease-out;
  @keyframes aparecer {
    from {
      opacity: 0;
    }
  }
`;

const Dialogo = styled.div`
  width: 100%;
  max-width: ${({ $ancho }) => $ancho};
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radiusLg};
  box-shadow: ${({ theme }) => theme.shadowLg};
  animation: subir 0.18s ease-out;
  @keyframes subir {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 20px 24px 12px;
    h2 {
      font-size: 1.15rem;
      font-weight: 700;
    }
    p {
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.9rem;
      margin-top: 2px;
    }
  }
  .cuerpo {
    padding: 8px 24px 24px;
    overflow-y: auto;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 24px;
    border-top: 1px solid ${({ theme }) => theme.border};
  }
`;

import { useContext } from "react";
import styled from "styled-components";
import { LuMoon, LuSun } from "react-icons/lu";
import { ThemeContext } from "../../context/contextoTema";

export function ToggleTema({ compacto = false }) {
  const { theme, setTheme } = useContext(ThemeContext);
  const oscuro = theme === "dark";

  return (
    <Container
      type="button"
      onClick={() => setTheme(oscuro ? "light" : "dark")}
      aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={oscuro ? "Tema claro" : "Tema oscuro"}
    >
      {oscuro ? <LuSun /> : <LuMoon />}
      {!compacto && <span>{oscuro ? "Tema claro" : "Tema oscuro"}</span>}
    </Container>
  );
}

const Container = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: none;
  border-radius: ${({ theme }) => theme.radiusSm};
  background: transparent;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  svg {
    font-size: 20px;
    flex-shrink: 0;
  }
  &:hover {
    background: ${({ theme }) => theme.surfaceAlt};
    color: ${({ theme }) => theme.text};
  }
`;

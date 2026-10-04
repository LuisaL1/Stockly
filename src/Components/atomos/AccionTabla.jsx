import styled from "styled-components";

export function AccionTabla({ funcion, icono, etiqueta, tono = "neutro" }) {
  return (
    <Container
      type="button"
      onClick={funcion}
      $tono={tono}
      aria-label={etiqueta}
      title={etiqueta}
    >
      {icono}
    </Container>
  );
}

const Container = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radiusSm};
  border: none;
  background: transparent;
  color: ${({ theme, $tono }) => ($tono === "peligro" ? theme.danger : theme.textMuted)};
  font-size: 18px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme, $tono }) =>
      $tono === "peligro" ? theme.dangerSoft : theme.surfaceHover};
    color: ${({ theme, $tono }) => ($tono === "peligro" ? theme.danger : theme.text)};
  }
`;

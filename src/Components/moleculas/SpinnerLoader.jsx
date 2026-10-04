import styled from "styled-components";

export function SpinnerLoader({ pantallaCompleta = false, texto = "Cargando..." }) {
  return (
    <Container $pantallaCompleta={pantallaCompleta} role="status">
      <span className="spinner" />
      <span className="texto">{texto}</span>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: ${({ $pantallaCompleta }) => ($pantallaCompleta ? "100vh" : "50vh")};
  background: ${({ theme, $pantallaCompleta }) => ($pantallaCompleta ? theme.bg : "transparent")};
  color: ${({ theme }) => theme.textMuted};
  .spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid ${({ theme }) => theme.border};
    border-top-color: ${({ theme }) => theme.primary};
    animation: girar 0.8s linear infinite;
  }
  .texto {
    font-size: 0.9rem;
  }
  @keyframes girar {
    to {
      transform: rotate(360deg);
    }
  }
`;

import styled from "styled-components";
import { LuShieldCheck } from "react-icons/lu";

export function FooterLogin() {
  return (
    <Container>
      <p className="seguro">
        <LuShieldCheck /> Conexión segura · MCCore
      </p>
      <p>© {new Date().getFullYear()} MCCore · Todos los derechos reservados</p>
    </Container>
  );
}

const Container = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.textMuted};
  text-align: center;
  .seguro {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

import styled from "styled-components";
import { LuShieldCheck } from "react-icons/lu";
import { CORREO_STOCKLY } from "../../../utils/marca";

export function FooterLogin() {
  return (
    <Container>
      <p className="seguro">
        <LuShieldCheck /> Conexión segura · MCCore
      </p>
      <p>
        ¿Necesitas ayuda? <a href={`mailto:${CORREO_STOCKLY}`}>{CORREO_STOCKLY}</a>
      </p>
      <p>
        <a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a>
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
  a {
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
    text-decoration: none;
  }
  .seguro {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`;

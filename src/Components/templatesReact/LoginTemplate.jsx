import { useState } from "react";
import styled from "styled-components";
import { ToggleTema } from "../organismos/ToggleTema";
import { FooterLogin } from "../organismos/sidebar/FooterLogin";
import { FormIngresar } from "../organismos/auth/FormIngresar";
import { FormRegistro } from "../organismos/auth/FormRegistro";
import { FormRecuperar, VistaVerificar } from "../organismos/auth/VistasCorreo";
import { Device } from "../../styles/breackpoints";
import { v } from "../../styles/variables";
import ilustracion from "../../assets/login-ilustracion.jpg";

// Pantalla de acceso: ingresar, crear empresa, recuperar contraseña y confirmar correo.
export function LoginTemplate() {
  // ?registro=1 (desde la página pública) abre directamente el registro.
  const [vista, setVista] = useState(() =>
    new URLSearchParams(window.location.search).get("registro") ? "registrar" : "ingresar",
  ); // ingresar | registrar | recuperar | verificar
  const [email, setEmail] = useState("");
  const registrando = vista === "registrar";

  const irA = (destino, correo) => {
    if (correo !== undefined) setEmail(correo);
    setVista(destino);
  };

  return (
    <Container $ancho={registrando}>
      <aside className="banner">
        <div className="marca">
          <img src={v.logo} alt="" />
          <span>Stockly</span>
        </div>
        <img className="ilustracion" src={ilustracion} alt="" />
      </aside>

      <section className="panel">
        <div className="superior">
          <div className="marca-movil">
            <img src={v.logo} alt="" />
            <span>Stockly</span>
          </div>
          <div className="tema">
            <ToggleTema compacto />
          </div>
        </div>

        <div className="tarjeta" key={vista}>
          {vista === "ingresar" && <FormIngresar irA={irA} emailInicial={email} />}
          {vista === "registrar" && (
            <FormRegistro
              irA={irA}
              alRegistrar={({ email: correo, confirmarCorreo }) => {
                setEmail(correo);
                // Si no hay que confirmar, la sesión ya está abierta y la ruta redirige sola.
                if (confirmarCorreo) setVista("verificar");
              }}
            />
          )}
          {vista === "recuperar" && <FormRecuperar irA={irA} emailInicial={email} />}
          {vista === "verificar" && <VistaVerificar irA={irA} email={email} />}
        </div>
        <FooterLogin />
      </section>
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr;
  background: ${({ theme }) => theme.bg};
  @media ${Device.laptop} {
    grid-template-columns: minmax(380px, 0.9fr) 1.1fr;
  }

  .banner {
    display: none;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow: hidden;
    background: #f4f1ec;
    color: #fff;
    @media ${Device.laptop} {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 32px;
    }
    .ilustracion {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .marca {
      position: relative;
      z-index: 1;
      color: #17131d;
    }
  }
  .marca,
  .marca-movil {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    font-size: 1.25rem;
    letter-spacing: -0.02em;
    img {
      width: 38px;
      height: 38px;
    }
  }

  .panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    min-height: 100vh;
    padding: 20px 16px 24px;
    @media ${Device.tablet} {
      padding: 28px 32px;
    }
  }
  .superior {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .marca-movil {
    @media ${Device.laptop} {
      visibility: hidden;
    }
  }
  .tema {
    width: 44px;
  }
  .tarjeta {
    width: 100%;
    max-width: ${({ $ancho }) => ($ancho ? "520px" : "420px")};
    margin: auto 0;
    padding: 28px 22px;
    border-radius: ${({ theme }) => theme.radiusXl};
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    box-shadow: ${({ theme }) => theme.shadowLg};
    animation: entrar 0.25s ease-out;
    @media ${Device.tablet} {
      padding: 36px 36px 30px;
    }
    @keyframes entrar {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
  }
`;

import styled from "styled-components";
import logo from "../assets/logo.png";
import { FAQ, FUNCIONES, HERO, PASOS, PLANES, SITIO, cop } from "./contenido";

// Página pública de Stockly. Se prerenderiza al compilar (scripts/prerender.mjs) para que
// Google la lea sin ejecutar JavaScript, y la app la muestra en "/" a quien no ha iniciado sesión.
// No usa el tema ni el router de la app: debe poder renderizarse en el servidor.
export function Landing() {
  return (
    <Pagina data-landing>
      <Barra>
        <a className="marca" href="/" aria-label="Stockly, inicio">
          <img src={logo} alt="" width="30" height="30" />
          Stockly
        </a>
        <nav aria-label="Secciones">
          <a href="#funciones">Funciones</a>
          <a href="#planes">Planes</a>
          <a href="#preguntas">Preguntas</a>
        </nav>
        <div className="acciones">
          <a className="enlace" href="/login">
            Iniciar sesión
          </a>
          <a className="boton" href={HERO.ctaPrincipal.href}>
            Empezar gratis
          </a>
        </div>
      </Barra>

      <main>
        <Hero>
          <div className="texto">
            <span className="etiqueta">{HERO.etiqueta}</span>
            <h1>{HERO.titulo}</h1>
            <p>{HERO.texto}</p>
            <div className="ctas">
              <a className="boton grande" href={HERO.ctaPrincipal.href}>
                {HERO.ctaPrincipal.texto}
              </a>
              <a className="boton secundario grande" href={HERO.ctaSecundario.href}>
                {HERO.ctaSecundario.texto}
              </a>
            </div>
            <ul className="notas">
              {HERO.notas.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
          {/* Vista de ejemplo de la caja (ilustración hecha con HTML, liviana). */}
          <figure className="ticket" aria-label="Ejemplo de una venta en Stockly">
            <div className="ticket-cab">
              <strong>Venta FV-128</strong>
              <span>Hoy · Caja principal</span>
            </div>
            <ul>
              <li>
                <span>2 × Camiseta básica algodón</span>
                <b>$70.000</b>
              </li>
              <li>
                <span>1 × Gorra negra bordada</span>
                <b>$39.000</b>
              </li>
              <li>
                <span>3 × Medias deportivas</span>
                <b>$27.000</b>
              </li>
            </ul>
            <div className="ticket-total">
              <span>Total</span>
              <strong>$136.000</strong>
            </div>
            <div className="ticket-pagos">
              <span>Efectivo $100.000</span>
              <span>Bre-B $36.000</span>
            </div>
            <div className="ticket-alerta">Gorra negra bordada: quedan 4 en bodega. Novandra sugiere pedir 30.</div>
          </figure>
        </Hero>

        <Seccion id="funciones" aria-labelledby="titulo-funciones">
          <h2 id="titulo-funciones">Todo lo que tu negocio necesita para vender y controlar su inventario</h2>
          <div className="funciones">
            {FUNCIONES.map((f) => (
              <article key={f.titulo}>
                <h3>{f.titulo}</h3>
                <p>{f.texto}</p>
              </article>
            ))}
          </div>
        </Seccion>

        <Seccion aria-labelledby="titulo-pasos">
          <h2 id="titulo-pasos">Empieza hoy en tres pasos</h2>
          <ol className="pasos">
            {PASOS.map((p) => (
              <li key={p.titulo}>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </Seccion>

        <Seccion id="planes" aria-labelledby="titulo-planes">
          <h2 id="titulo-planes">Planes para cada etapa de tu negocio</h2>
          <p className="intro">Precios finales en pesos colombianos. Paga mensual o anual (2 meses gratis). 50% de descuento en tu primera compra.</p>
          <div className="planes">
            {PLANES.map((p) => (
              <article key={p.id} className={p.destacado ? "destacado" : ""}>
                <h3>{p.nombre}</h3>
                <p className="detalle">{p.detalle}</p>
                <p className="precio">
                  {p.precio ? (
                    <>
                      <strong>{cop(p.precio)}</strong> <span>/ mes</span>
                    </>
                  ) : (
                    <strong>Gratis</strong>
                  )}
                </p>
                {p.precioAnual ? <p className="anual">o {cop(p.precioAnual)} al año</p> : <p className="anual">Para siempre</p>}
                <ul>
                  {p.incluye.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <a className={`boton ${p.destacado ? "" : "secundario"}`} href={HERO.ctaPrincipal.href}>
                  {p.precio ? `Elegir ${p.nombre}` : "Empezar gratis"}
                </a>
              </article>
            ))}
          </div>
        </Seccion>

        <Seccion id="preguntas" aria-labelledby="titulo-faq">
          <h2 id="titulo-faq">Preguntas frecuentes</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.p}>
                <summary>{f.p}</summary>
                <p>{f.r}</p>
              </details>
            ))}
          </div>
        </Seccion>

        <Final>
          <h2>Ordena tu negocio desde hoy</h2>
          <p>Crea tu empresa gratis y empieza a vender en minutos.</p>
          <a className="boton grande" href={HERO.ctaPrincipal.href}>
            {HERO.ctaPrincipal.texto}
          </a>
        </Final>
      </main>

      <Pie>
        <p>
          {SITIO.nombre} es un producto de{" "}
          <a href={SITIO.empresaUrl} rel="noopener">
            {SITIO.empresa}
          </a>{" "}
          · {SITIO.ciudad}, Colombia · {SITIO.correo}
        </p>
        <nav aria-label="Legal">
          <a href="/terminos">Términos</a>
          <a href="/privacidad">Privacidad</a>
          <a href="/login">Iniciar sesión</a>
        </nav>
      </Pie>
    </Pagina>
  );
}

const MORADO = "#8800B3";
const TINTA = "#17131D";
const GRIS = "#5E5766";
const LINEA = "#E7E2DA";
const FONDO = "#F4F1EC";
const SUAVE = "#F2E7F8";

const Pagina = styled.div`
  min-height: 100vh;
  background: ${FONDO};
  color: ${TINTA};
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
  main {
    display: flex;
    flex-direction: column;
    gap: 72px;
    max-width: 1120px;
    margin: 0 auto;
    padding: 24px 20px 72px;
  }
  h1,
  h2,
  h3 {
    margin: 0;
    line-height: 1.15;
    text-wrap: balance;
  }
  p {
    margin: 0;
  }
  a {
    color: inherit;
  }
  .boton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 18px;
    border-radius: 12px;
    background: ${MORADO};
    color: #fff;
    font-weight: 600;
    text-decoration: none;
    border: 1.5px solid ${MORADO};
    transition: background 0.15s;
    &:hover {
      background: #6d0090;
    }
    &.secundario {
      background: #fff;
      color: ${MORADO};
      &:hover {
        background: ${SUAVE};
      }
    }
    &.grande {
      padding: 14px 24px;
      font-size: 1.02rem;
    }
    &:focus-visible {
      outline: 3px solid ${SUAVE};
      outline-offset: 2px;
    }
  }
`;

const Barra = styled.header`
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 1120px;
  margin: 0 auto;
  padding: 14px 20px;
  background: ${FONDO};
  .marca {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    font-size: 1.15rem;
    text-decoration: none;
  }
  nav {
    display: none;
    gap: 22px;
    margin-left: 18px;
    a {
      color: ${GRIS};
      text-decoration: none;
      font-weight: 500;
      &:hover {
        color: ${MORADO};
      }
    }
    @media (min-width: 820px) {
      display: flex;
    }
  }
  .acciones {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 14px;
    white-space: nowrap;
  }
  .enlace {
    font-weight: 600;
    text-decoration: none;
    color: ${MORADO};
  }
  @media (max-width: 420px) {
    padding: 12px 16px;
    gap: 10px;
    .acciones {
      gap: 10px;
      font-size: 0.9rem;
    }
    .acciones .boton {
      padding: 8px 12px;
    }
  }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;
  align-items: center;
  padding-top: 24px;
  @media (min-width: 900px) {
    grid-template-columns: 1.15fr 0.85fr;
  }
  .texto {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }
  .etiqueta {
    align-self: flex-start;
    padding: 5px 12px;
    border-radius: 999px;
    background: ${SUAVE};
    color: ${MORADO};
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.03em;
  }
  h1 {
    font-size: clamp(2.1rem, 5vw, 3.4rem);
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .texto > p {
    font-size: 1.12rem;
    color: ${GRIS};
    max-width: 60ch;
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .notas {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    margin: 0;
    padding: 0;
    list-style: none;
    color: ${GRIS};
    font-size: 0.9rem;
    li::before {
      content: "✓ ";
      color: ${MORADO};
      font-weight: 700;
    }
  }
  .ticket {
    margin: 0;
    padding: 20px;
    border-radius: 20px;
    background: #fff;
    border: 1px solid ${LINEA};
    box-shadow: 0 24px 60px -30px rgba(23, 19, 29, 0.35);
    display: flex;
    flex-direction: column;
    gap: 14px;
    font-variant-numeric: tabular-nums;
    min-width: 0;
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.92rem;
    }
  }
  .ticket-cab {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    span {
      color: ${GRIS};
      font-size: 0.85rem;
    }
  }
  .ticket-total {
    display: flex;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid ${LINEA};
    font-size: 1.1rem;
    strong {
      color: ${MORADO};
    }
  }
  .ticket-pagos {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    span {
      padding: 4px 10px;
      border-radius: 999px;
      background: ${FONDO};
      font-size: 0.8rem;
      font-weight: 600;
    }
  }
  .ticket-alerta {
    padding: 10px 12px;
    border-radius: 12px;
    background: ${SUAVE};
    color: ${TINTA};
    font-size: 0.85rem;
  }
`;

const Seccion = styled.section`
  display: flex;
  flex-direction: column;
  gap: 22px;
  scroll-margin-top: 80px;
  h2 {
    font-size: clamp(1.6rem, 3.4vw, 2.2rem);
    font-weight: 800;
    letter-spacing: -0.01em;
    max-width: 26ch;
  }
  .intro {
    color: ${GRIS};
    max-width: 65ch;
  }
  .funciones {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    article {
      padding: 20px;
      border-radius: 16px;
      background: #fff;
      border: 1px solid ${LINEA};
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    h3 {
      font-size: 1.05rem;
    }
    p {
      color: ${GRIS};
      font-size: 0.95rem;
    }
  }
  .pasos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: paso;
    li {
      counter-increment: paso;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 20px;
      border-radius: 16px;
      border: 1px dashed ${MORADO};
      background: #fff;
    }
    li::before {
      content: counter(paso);
      display: grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: ${SUAVE};
      color: ${MORADO};
      font-weight: 800;
    }
    p {
      color: ${GRIS};
    }
  }
  .planes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    align-items: stretch;
    article {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 22px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid ${LINEA};
    }
    article.destacado {
      border: 2px solid ${MORADO};
    }
    .detalle {
      color: ${GRIS};
      font-size: 0.92rem;
    }
    .precio strong {
      font-size: 1.9rem;
      font-weight: 800;
    }
    .precio span,
    .anual {
      color: ${GRIS};
      font-size: 0.88rem;
    }
    ul {
      margin: 4px 0 8px;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
  }
  .faq {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 820px;
    details {
      padding: 14px 18px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid ${LINEA};
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    details p {
      margin-top: 8px;
      color: ${GRIS};
    }
  }
`;

const Final = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  padding: 40px 20px;
  border-radius: 24px;
  background: ${TINTA};
  color: #fff;
  h2 {
    font-size: clamp(1.6rem, 3.4vw, 2.2rem);
    font-weight: 800;
  }
  p {
    color: rgba(255, 255, 255, 0.75);
  }
`;

const Pie = styled.footer`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 20px 40px;
  border-top: 1px solid ${LINEA};
  color: ${GRIS};
  font-size: 0.88rem;
  nav {
    display: flex;
    gap: 16px;
  }
  a {
    color: ${GRIS};
  }
`;

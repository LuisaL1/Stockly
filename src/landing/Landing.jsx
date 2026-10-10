import styled from "styled-components";
import logo from "../assets/logo.png";
import ilustracion from "../assets/login-ilustracion.jpg";
import { FAQ, FUNCIONES, HERO, PASOS, PLANES, SITIO, cop } from "./contenido";
import { BordeVivo, Cinta, Flotante, Formas, WidgetNovandra, WidgetPagos, WidgetStock, WidgetTicket, WidgetVentas, WidgetWhatsApp } from "./widgets";
import { GRIS, LINEA, MORADO, MORADO_CLARO, PAPEL, SUAVE, TINTA, sinMovimiento } from "./tokens";

// Página pública de Stockly (estilo bento, con mini-widgets animados de la interfaz).
// Se prerenderiza al compilar (scripts/prerender.mjs): solo CSS para el movimiento.
export function Landing() {
  const cinta = ["Caja ágil", "Bre-B", "Link de pago con Wompi", "Facturas por WhatsApp", "Bodegas y sedes", "Kardex", "Informe para tu contador", "Novandra", "Importa desde Excel", "Gratis para siempre"];
  const iconos = ["▣", "▤", "⌂", "✆", "⇄", "▥", "◔", "✦", "☺"];
  return (
    <Pagina data-landing>
      <Formas aria-hidden="true">
        <span />
        <span />
        <span />
      </Formas>
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
            <h1>
              Tu inventario, <em>por fin en orden.</em>
            </h1>
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
          <div className="bento" aria-label="Así se ve Stockly en acción">
            <div className="celda ventas">
              <WidgetVentas />
            </div>
            <div className="celda ticket">
              <WidgetTicket />
            </div>
            <div className="celda wa">
              <WidgetWhatsApp />
            </div>
            <div className="celda stock">
              <WidgetStock />
            </div>
            <div className="celda nov">
              <WidgetNovandra />
            </div>
          </div>
        </Hero>

        <Cinta items={cinta} />

        <Seccion id="funciones" aria-labelledby="titulo-funciones">
          <h2 id="titulo-funciones">Todo tu negocio. Bajo un mismo techo.</h2>
          <div className="bento-funciones">
            <article className="grande">
              <div className="cab">
                <span className="icono">{iconos[0]}</span>
                <h3>{FUNCIONES[0].titulo}</h3>
              </div>
              <p>{FUNCIONES[0].texto}</p>
              <div className="demo">
                <WidgetPagos />
              </div>
            </article>
            <article className="alta">
              <div className="cab">
                <span className="icono">{iconos[7]}</span>
                <h3>{FUNCIONES[7].titulo}</h3>
              </div>
              <p>{FUNCIONES[7].texto}</p>
              <div className="demo">
                <WidgetNovandra />
              </div>
            </article>
            {[1, 2, 3, 4, 5, 6, 8].map((i) => (
              <article key={FUNCIONES[i].titulo}>
                <div className="cab">
                  <span className="icono">{iconos[i]}</span>
                  <h3>{FUNCIONES[i].titulo}</h3>
                </div>
                <p>{FUNCIONES[i].texto}</p>
              </article>
            ))}
          </div>
        </Seccion>

        <Seccion aria-labelledby="titulo-pasos">
          <h2 id="titulo-pasos">Tres pasos. Y a vender.</h2>
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
          <h2 id="titulo-planes">Un plan para cada momento.</h2>
          <p className="intro">Precios finales, en pesos. Mensual o anual con 2 meses gratis. Y 50% de descuento en tu primera compra.</p>
          <div className="planes">
            {PLANES.map((p) => {
              const tarjeta = (
                <article className={p.destacado ? "destacado" : ""}>
                  {p.destacado && <span className="cinta-plan">Más elegido</span>}
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
              );
              return p.destacado ? (
                <BordeVivo key={p.id}>
                  <div>{tarjeta}</div>
                </BordeVivo>
              ) : (
                <div key={p.id}>{tarjeta}</div>
              );
            })}
          </div>
        </Seccion>

        <Seccion id="preguntas" aria-labelledby="titulo-faq">
          <h2 id="titulo-faq">Lo que todos preguntan.</h2>
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
          <div className="texto">
            <h2>¿Empezamos?</h2>
            <p>Crea tu empresa gratis. En un minuto estás vendiendo.</p>
            <a className="boton grande" href={HERO.ctaPrincipal.href}>
              {HERO.ctaPrincipal.texto}
            </a>
          </div>
          <Flotante src={ilustracion} alt="" width="420" height="600" loading="lazy" />
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

const Pagina = styled.div`
  ${sinMovimiento}
  position: relative;
  min-height: 100vh;
  background: ${PAPEL};
  color: ${TINTA};
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
  overflow-x: hidden;
  main {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 76px;
    max-width: 1160px;
    margin: 0 auto;
    padding: 20px 20px 80px;
  }
  h1,
  h2,
  h3 {
    margin: 0;
    line-height: 1.12;
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
    padding: 11px 18px;
    border-radius: 12px;
    background: ${MORADO};
    color: #fff;
    font-weight: 700;
    text-decoration: none;
    border: 1.5px solid ${MORADO};
    transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
    &:hover {
      background: #6d0090;
      transform: translateY(-1px);
      box-shadow: 0 12px 30px -12px rgba(136, 0, 179, 0.6);
    }
    &.secundario {
      background: #fff;
      color: ${MORADO};
      &:hover {
        background: ${SUAVE};
      }
    }
    &.grande {
      padding: 15px 26px;
      font-size: 1.04rem;
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
  max-width: 1160px;
  margin: 0 auto;
  padding: 14px 20px;
  background: rgba(244, 241, 236, 0.85);
  backdrop-filter: blur(12px);
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
  padding-top: 28px;
  @media (min-width: 960px) {
    grid-template-columns: 0.95fr 1.05fr;
    gap: 44px;
  }
  .texto {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }
  .etiqueta {
    align-self: flex-start;
    padding: 6px 12px;
    border-radius: 999px;
    background: ${SUAVE};
    color: ${MORADO};
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.03em;
  }
  h1 {
    font-size: clamp(2.2rem, 5vw, 3.6rem);
    font-weight: 800;
    letter-spacing: -0.025em;
    em {
      font-style: normal;
      color: ${MORADO};
    }
  }
  .texto > p {
    font-size: 1.12rem;
    color: ${GRIS};
    max-width: 56ch;
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
  /* Cuadrícula bento con los widgets */
  .bento {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: auto;
    min-width: 0;
    @media (min-width: 560px) {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }
  .celda {
    min-width: 0;
    display: flex;
    > * {
      flex: 1;
    }
  }
  .ventas {
    grid-column: span 2;
    @media (min-width: 560px) {
      grid-column: span 3;
    }
  }
  .ticket {
    grid-column: span 2;
    @media (min-width: 560px) {
      grid-column: span 3;
      grid-row: span 2;
    }
  }
  .wa {
    grid-column: span 2;
    @media (min-width: 560px) {
      grid-column: span 3;
    }
  }
  .stock {
    grid-column: span 2;
    @media (min-width: 560px) {
      grid-column: span 3;
    }
  }
  .nov {
    grid-column: span 2;
    @media (min-width: 560px) {
      grid-column: span 3;
    }
  }
`;

const Seccion = styled.section`
  display: flex;
  flex-direction: column;
  gap: 24px;
  scroll-margin-top: 84px;
  h2 {
    font-size: clamp(1.7rem, 3.4vw, 2.3rem);
    font-weight: 800;
    letter-spacing: -0.015em;
    max-width: 26ch;
  }
  .intro {
    color: ${GRIS};
    max-width: 65ch;
  }
  .bento-funciones {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
    grid-auto-flow: dense;
    article {
      min-width: 0;
      padding: 22px;
      border-radius: 20px;
      background: #fff;
      border: 1px solid ${LINEA};
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: transform 0.2s, box-shadow 0.2s;
      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 24px 50px -30px rgba(23, 19, 29, 0.35);
      }
    }
    .grande {
      grid-column: span 2;
      @media (max-width: 560px) {
        grid-column: span 1;
      }
    }
    .alta {
      grid-row: span 2;
      background: ${TINTA};
      color: ${PAPEL};
      border: none;
      p {
        color: rgba(244, 241, 236, 0.72);
      }
      .icono {
        background: rgba(226, 164, 255, 0.16);
        color: ${MORADO_CLARO};
      }
    }
    .cab {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .icono {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      display: grid;
      place-items: center;
      background: ${SUAVE};
      color: ${MORADO};
      font-size: 1rem;
      flex: none;
    }
    h3 {
      font-size: 1.05rem;
    }
    p {
      color: ${GRIS};
      font-size: 0.95rem;
    }
    .demo {
      margin-top: auto;
      display: flex;
      > * {
        flex: 1;
      }
    }
  }
  .pasos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: paso;
    li {
      counter-increment: paso;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 22px;
      border-radius: 20px;
      border: 1px dashed ${MORADO};
      background: #fff;
    }
    li::before {
      content: counter(paso);
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: ${MORADO};
      color: #fff;
      font-weight: 800;
    }
    p {
      color: ${GRIS};
    }
  }
  .planes {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
    align-items: stretch;
    > div {
      display: flex;
      min-width: 0;
    }
    article {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 24px;
      border-radius: 20px;
      background: #fff;
      border: 1px solid ${LINEA};
      min-width: 0;
    }
    article.destacado {
      border: none;
    }
    .cinta-plan {
      position: absolute;
      top: -12px;
      left: 20px;
      background: ${MORADO};
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
    }
    .detalle {
      color: ${GRIS};
      font-size: 0.92rem;
    }
    .precio strong {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
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
  position: relative;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: 20px;
  padding: 44px 28px;
  border-radius: 28px;
  background: radial-gradient(ellipse at 20% 20%, #a51bd1 0%, ${MORADO} 40%, #4b0063 100%);
  color: #fff;
  overflow: hidden;
  @media (min-width: 820px) {
    grid-template-columns: 1.3fr 0.7fr;
    padding: 56px 60px;
  }
  .texto {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: flex-start;
    position: relative;
    z-index: 1;
  }
  h2 {
    font-size: clamp(1.7rem, 3.4vw, 2.4rem);
    font-weight: 800;
  }
  p {
    color: rgba(255, 255, 255, 0.8);
  }
  .boton {
    background: #fff;
    color: ${MORADO};
    border-color: #fff;
    &:hover {
      background: ${SUAVE};
    }
  }
  img {
    justify-self: center;
    width: min(100%, 320px);
    height: auto;
    border-radius: 24px;
    box-shadow: 0 40px 80px -40px rgba(0, 0, 0, 0.6);
  }
`;

const Pie = styled.footer`
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  max-width: 1160px;
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

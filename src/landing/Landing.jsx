import styled from "styled-components";
import logo from "../assets/logo.png";
import { FAQ, FUNCIONES, HERO, PASOS, PLANES, SITIO, cop } from "./contenido";
import { Movil, PanelHoy, PanelPlan, PanelStock, PanelTicket, PanelVentas, VentanaApp, VisualBodegas, VisualCaja, VisualNovandra, VisualTelefono } from "./widgets";
import { GRIS, LINEA, MORADO, MORADO_CLARO, PAPEL, SUAVE, TINTA, sinMovimiento } from "./tokens";

// Página pública de Stockly. Titular grande, la app en una ventana, y una historia por función.
// Se prerenderiza al compilar (scripts/prerender.mjs): el movimiento es solo CSS.
export function Landing() {
  const mas = [1, 2, 4, 5, 6, 8].map((i) => FUNCIONES[i]);
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
          <a className="boton secundario" href="/login">
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
              <a className="boton secundario grande" href="#funciones">
                Ver cómo funciona
              </a>
            </div>
            <ul className="notas">
              {HERO.notas.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
          <Movil />
          <VentanaApp className="ventana" aria-label="Así se ve el panel de Stockly">
            <div className="barra">
              <i />
              <i />
              <i />
              <span>appstockly.com · Tienda Central</span>
            </div>
            <div className="cuerpo">
              <div className="lateral">
                <b>GENERAL</b>
                <span className="activo">Inicio</span>
                <span>Inteligencia</span>
                <b>OPERACIÓN</b>
                <span>Vender</span>
                <span>Facturas</span>
                <span>Compras</span>
                <b>INVENTARIO</b>
                <span>Productos</span>
                <span>Bodegas</span>
                <span>Reportes</span>
              </div>
              <div className="panel">
                <div className="saludo">
                  <strong>Buenas tardes, Camila</strong>
                  <span>Así va tu tienda hoy.</span>
                </div>
                <PanelVentas />
                <PanelHoy />
                <PanelTicket />
                <PanelStock />
                <PanelPlan />
              </div>
            </div>
          </VentanaApp>
        </Hero>

        <Historia id="funciones">
          <div className="texto">
            <span className="eyebrow">Caja</span>
            <h2>Cobra en segundos. Como tu cliente quiera.</h2>
            <p>Efectivo, tarjeta, Bre-B, Nequi o un link de pago. Pago mixto y crédito, si lo necesitas. Buscas el producto, cobras y el inventario se descuenta solo.</p>
          </div>
          <VisualCaja />
        </Historia>

        <Historia className="invertida">
          <div className="texto">
            <span className="eyebrow">Inventario</span>
            <h2>Sabe qué tienes. En cada bodega.</h2>
            <p>Productos, códigos de barras y stock mínimo. Cada sede con su stock, traslados que se actualizan solos y un aviso antes de que algo se agote.</p>
          </div>
          <VisualBodegas />
        </Historia>

        <Historia>
          <div className="texto">
            <span className="eyebrow">Facturas y cobros</span>
            <h2>La factura va por WhatsApp. El pago llega solo.</h2>
            <p>Con tu logo, en PDF y con el link de pago de Wompi. Cuando el cliente paga, la factura se marca sola. Sin perseguir a nadie.</p>
          </div>
          <VisualTelefono />
        </Historia>

        <Oscura>
          <div className="texto">
            <span className="eyebrow">Novandra</span>
            <h2>Pregúntale a tu negocio. Te responde.</h2>
            <p>Novandra conoce tus ventas, tu stock y tus proveedores. Qué reponer, qué no rota, cuánto pedir. Y deja las órdenes de compra listas: tú solo apruebas.</p>
          </div>
          <VisualNovandra />
        </Oscura>

        <Mas aria-labelledby="titulo-mas">
          <h2 id="titulo-mas">Y todo lo demás que tu negocio necesita.</h2>
          <ul>
            {mas.map((f) => (
              <li key={f.titulo}>
                <h3>{f.titulo}</h3>
                <p>{f.texto}</p>
              </li>
            ))}
          </ul>
        </Mas>

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
            {PLANES.map((p) => (
              <article key={p.id} className={p.destacado ? "destacado" : ""}>
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
            ))}
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
          <h2>¿Empezamos?</h2>
          <p>Crea tu empresa gratis. En un minuto estás vendiendo.</p>
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

const Pagina = styled.div`
  ${sinMovimiento}
  min-height: 100vh;
  background: ${PAPEL};
  color: ${TINTA};
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
  overflow-x: hidden;
  main {
    display: flex;
    flex-direction: column;
    gap: 96px;
    max-width: 1120px;
    margin: 0 auto;
    padding: 24px 20px 80px;
  }
  h1,
  h2,
  h3 {
    margin: 0;
    line-height: 1.1;
    text-wrap: balance;
    letter-spacing: -0.025em;
  }
  p {
    margin: 0;
  }
  a {
    color: inherit;
  }
  /* Solo lo clicable reacciona al cursor */
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
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    &:hover {
      background: #6d0090;
      transform: translateY(-1px);
    }
    &.secundario {
      background: #fff;
      color: ${MORADO};
      &:hover {
        background: ${SUAVE};
      }
    }
    &.grande {
      padding: 15px 28px;
      font-size: 1.04rem;
      border-radius: 14px;
    }
    &:focus-visible {
      outline: 3px solid ${SUAVE};
      outline-offset: 2px;
    }
  }
  .eyebrow {
    display: inline-block;
    color: ${MORADO};
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
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
  background: rgba(244, 239, 233, 0.92);
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
  @media (max-width: 480px) {
    padding: 12px 16px;
    gap: 10px;
    .marca {
      font-size: 0;
      gap: 0;
    }
    .acciones {
      gap: 8px;
      font-size: 0.9rem;
    }
    .acciones .boton {
      padding: 8px 12px;
    }
  }
`;

const Hero = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-top: 16px;
  .texto {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    min-width: 0;
  }
  .etiqueta {
    padding: 6px 12px;
    border-radius: 999px;
    background: ${SUAVE};
    color: ${MORADO};
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.03em;
  }
  h1 {
    font-size: clamp(2.6rem, 6vw, 4.4rem);
    font-weight: 800;
    max-width: 14ch;
    em {
      font-style: normal;
      color: ${MORADO};
    }
  }
  .texto > p {
    font-size: clamp(1.05rem, 1.6vw, 1.25rem);
    color: ${GRIS};
    max-width: 44ch;
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
  }
  .notas {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
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
  /* La app en el teléfono, con avisos flotantes; abajo, la ventana de escritorio */
  .movil-escena {
    --k: 0.6;
    position: relative;
    z-index: 2;
    margin: 10px auto -6px;
  }
  @media (min-width: 480px) {
    .movil-escena {
      --k: 0.78;
    }
  }
  .ventana {
    position: relative;
    z-index: 1;
    width: 100%;
  }
  @media (min-width: 960px) {
    display: block;
    text-align: left;
    padding-top: 36px;
    .texto {
      align-items: flex-start;
      justify-content: center;
      max-width: 620px;
      min-height: 520px;
    }
    .ctas,
    .notas {
      justify-content: flex-start;
    }
    .movil-escena {
      --k: 1;
      position: absolute;
      top: -10px;
      right: 8px;
      margin: 0;
    }
    .ventana {
      margin-top: 14px;
    }
  }
`;

const Historia = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  align-items: center;
  scroll-margin-top: 84px;
  @media (min-width: 880px) {
    grid-template-columns: 0.85fr 1.15fr;
    gap: 56px;
    &.invertida {
      grid-template-columns: 1.15fr 0.85fr;
      .texto {
        order: 2;
      }
    }
  }
  .texto {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  h2 {
    font-size: clamp(1.9rem, 3.6vw, 2.8rem);
    font-weight: 800;
  }
  p {
    color: ${GRIS};
    font-size: 1.08rem;
    max-width: 44ch;
  }
`;

const Oscura = styled(Historia)`
  background: ${TINTA};
  color: ${PAPEL};
  border-radius: 28px;
  padding: 40px 28px;
  @media (min-width: 880px) {
    padding: 56px;
  }
  .eyebrow {
    color: ${MORADO_CLARO};
  }
  p {
    color: rgba(244, 241, 236, 0.72);
  }
`;

const Mas = styled.section`
  display: flex;
  flex-direction: column;
  gap: 28px;
  h2 {
    font-size: clamp(1.7rem, 3.2vw, 2.3rem);
    font-weight: 800;
    max-width: 24ch;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 28px 32px;
  }
  li {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 16px;
    border-top: 2px solid ${TINTA};
    min-width: 0;
  }
  h3 {
    font-size: 1.05rem;
  }
  p {
    color: ${GRIS};
    font-size: 0.96rem;
  }
`;

const Seccion = styled.section`
  display: flex;
  flex-direction: column;
  gap: 24px;
  scroll-margin-top: 84px;
  h2 {
    font-size: clamp(1.7rem, 3.2vw, 2.3rem);
    font-weight: 800;
    max-width: 26ch;
  }
  .intro {
    color: ${GRIS};
    max-width: 65ch;
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
      background: #fff;
      border: 1px solid ${LINEA};
    }
    li::before {
      content: counter(paso);
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: ${TINTA};
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
    article {
      position: relative;
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
      border: 2px solid ${MORADO};
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
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  padding: 56px 28px;
  border-radius: 28px;
  background: ${MORADO};
  color: #fff;
  h2 {
    font-size: clamp(1.9rem, 3.6vw, 2.8rem);
    font-weight: 800;
  }
  p {
    color: rgba(255, 255, 255, 0.82);
    font-size: 1.08rem;
    max-width: 40ch;
  }
  .boton {
    margin-top: 8px;
    background: #fff;
    color: ${MORADO};
    border-color: #fff;
    &:hover {
      background: ${SUAVE};
    }
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

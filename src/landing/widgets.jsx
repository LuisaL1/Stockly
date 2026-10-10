import styled, { keyframes } from "styled-components";
import { GRIS, LINEA, MORADO, MORADO_CLARO, PAPEL, SUAVE, TINTA, TINTA2, VERDE } from "./tokens";

// Visuales animados de la página pública. Solo CSS (keyframes): funcionan prerenderizados
// y respetan "prefers-reduced-motion". Nada aquí es clicable, así que no hay estados hover.

const CICLO = "9s";

const aparecer = keyframes`
  0%, 100% { opacity: 0; transform: translateY(8px); }
  10%, 88% { opacity: 1; transform: translateY(0); }
  96% { opacity: 0; }
`;
const sello = keyframes`
  0%, 58% { opacity: 0; transform: rotate(-6deg) scale(0.5); }
  64% { opacity: 1; transform: rotate(-6deg) scale(1.1); }
  69%, 92% { opacity: 1; transform: rotate(-6deg) scale(1); }
  100% { opacity: 0; transform: rotate(-6deg) scale(0.9); }
`;
const vaciar = keyframes`
  0%, 8% { width: 76%; background: ${MORADO}; }
  58%, 90% { width: 9%; background: #DC2626; }
  100% { width: 76%; background: ${MORADO}; }
`;
const alerta = keyframes`
  0%, 56% { opacity: 0; transform: translateY(6px); }
  64%, 92% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; }
`;
const puntos = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
`;
const escribir = keyframes`
  0%, 6% { width: 0; }
  34%, 100% { width: 100%; }
`;
const respuesta = keyframes`
  0%, 36% { opacity: 0; transform: translateY(8px); }
  42%, 96% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; }
`;
const pensar = keyframes`
  0%, 30% { opacity: 0; }
  32%, 38% { opacity: 1; }
  40%, 100% { opacity: 0; }
`;
const desplazar = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;
const encender = keyframes`
  0%, 100% { background: #fff; color: ${TINTA}; border-color: ${LINEA}; }
  10%, 20% { background: ${SUAVE}; color: ${MORADO}; border-color: ${MORADO}; }
`;

// --------------------------------------------------------------- Historias (un visual distinto por función)

// Caja: los medios de pago se encienden y cae el sello de cobrado.
export function VisualCaja() {
  const medios = ["Efectivo", "Datáfono", "Bre-B", "Nequi", "Daviplata", "Link de pago", "Crédito", "Pago mixto"];
  return (
    <Caja>
      <div className="medios">
        {medios.map((m, i) => (
          <span key={m} style={{ animationDelay: `${i * 0.7}s` }}>
            {m}
          </span>
        ))}
      </div>
      <div className="pie">
        <div>
          <span className="muted">Total</span>
          <strong>$ 116.620</strong>
        </div>
        <div className="sello">✓ Cobrada</div>
      </div>
    </Caja>
  );
}
const Caja = styled.div`
  background: #fff;
  border: 1px solid ${LINEA};
  border-radius: 20px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  .medios {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px;
    span {
      padding: 14px 10px;
      border-radius: 12px;
      border: 1.5px solid ${LINEA};
      font-weight: 600;
      font-size: 0.86rem;
      text-align: center;
      animation: ${encender} ${CICLO} ease-in-out infinite;
    }
  }
  .pie {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid ${LINEA};
    .muted {
      display: block;
      color: ${GRIS};
      font-size: 0.8rem;
    }
    strong {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
  }
  .sello {
    background: #15803d;
    color: #fff;
    font-weight: 800;
    padding: 8px 16px;
    border-radius: 10px;
    opacity: 0;
    animation: ${sello} ${CICLO} ease-in-out infinite;
  }
`;

// Inventario: tres bodegas con sus unidades y una barra que se vacía.
export function VisualBodegas() {
  const bodegas = [
    ["Bodega principal", 369, "$ 11.737.000"],
    ["Tienda Calarcá", 87, "$ 2.195.000"],
    ["Tienda online", 32, "$ 768.000"],
  ];
  return (
    <Bodegas>
      {bodegas.map(([n, u, c]) => (
        <div className="bodega" key={n}>
          <span className="nombre">{n}</span>
          <strong>{u}</strong>
          <span className="muted">unidades</span>
          <span className="muted">{c} a costo</span>
        </div>
      ))}
      <div className="fila">
        <span>Gorra negra bordada</span>
        <div className="barra">
          <div className="nivel" />
        </div>
        <em>4 und</em>
      </div>
      <div className="alerta">⚠ Stock bajo. Novandra sugiere pedir 30 a Textiles del Eje.</div>
    </Bodegas>
  );
}
const Bodegas = styled.div`
  background: #fff;
  border: 1px solid ${LINEA};
  border-radius: 20px;
  padding: 22px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  font-variant-numeric: tabular-nums;
  .bodega {
    min-width: 0;
    padding: 14px;
    border-radius: 14px;
    background: ${PAPEL};
    display: flex;
    flex-direction: column;
    gap: 2px;
    .nombre {
      font-weight: 700;
      font-size: 0.86rem;
    }
    strong {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .muted {
      color: ${GRIS};
      font-size: 0.74rem;
      white-space: nowrap;
    }
  }
  .fila,
  .alerta {
    grid-column: 1 / -1;
  }
  .fila {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    margin-top: 6px;
    em {
      font-style: normal;
      color: #dc2626;
      font-weight: 700;
    }
  }
  .barra {
    flex: 1;
    height: 10px;
    border-radius: 999px;
    background: ${PAPEL};
    overflow: hidden;
  }
  .nivel {
    height: 100%;
    border-radius: 999px;
    animation: ${vaciar} ${CICLO} ease-in-out infinite;
  }
  .alerta {
    padding: 10px 14px;
    border-radius: 12px;
    background: ${SUAVE};
    font-size: 0.86rem;
    font-weight: 600;
    opacity: 0;
    animation: ${alerta} ${CICLO} ease-in-out infinite;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

// WhatsApp: un teléfono con el chat; la factura llega y queda pagada.
export function VisualTelefono() {
  return (
    <Telefono>
      <div className="pantalla">
        <div className="cabecera">
          <i /> María Fernanda
        </div>
        <div className="chat">
          <div className="burbuja mia">
            Hola María, te compartimos tu factura <b>FV-128</b>.
            <span className="pdf">PDF · factura-FV-128.pdf</span>
            <span className="link">Paga aquí: checkout.wompi.co/l/3Z0Cfi</span>
          </div>
          <div className="burbuja">¡Listo, ya pagué!</div>
          <div className="pagada">✓ Factura pagada</div>
        </div>
      </div>
    </Telefono>
  );
}
const Telefono = styled.div`
  width: min(100%, 320px);
  margin: 0 auto;
  border-radius: 36px;
  padding: 10px;
  background: ${TINTA};
  box-shadow: 0 40px 90px -40px rgba(23, 19, 29, 0.6);
  .pantalla {
    border-radius: 28px;
    overflow: hidden;
    background: #e5ddd5;
    min-height: 420px;
    display: flex;
    flex-direction: column;
  }
  .cabecera {
    background: #075e54;
    color: #fff;
    padding: 18px 14px 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    i {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #128c7e;
    }
  }
  .chat {
    position: relative;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }
  .burbuja {
    background: #fff;
    border-radius: 12px;
    padding: 8px 11px;
    font-size: 0.84rem;
    line-height: 1.4;
    align-self: flex-start;
    max-width: 88%;
    opacity: 0;
    animation: ${aparecer} ${CICLO} ease-in-out infinite;
    animation-delay: 3s;
  }
  .burbuja.mia {
    background: #dcf8c6;
    align-self: flex-end;
    animation-delay: 0.4s;
  }
  .pdf,
  .link {
    display: block;
    margin-top: 6px;
    font-size: 0.76rem;
  }
  .pdf {
    background: #fff;
    border-radius: 8px;
    padding: 6px 8px;
    font-weight: 600;
  }
  .link {
    color: #0b57d0;
    text-decoration: underline;
    word-break: break-all;
  }
  .pagada {
    position: absolute;
    right: 14px;
    bottom: 16px;
    background: ${VERDE};
    color: #063d1e;
    font-weight: 800;
    padding: 8px 12px;
    border-radius: 10px;
    opacity: 0;
    animation: ${sello} ${CICLO} ease-in-out infinite;
  }
`;

// Novandra: la pregunta se escribe, piensa y responde con una tabla.
export function VisualNovandra() {
  const filas = [
    ["Cargador rápido USB-C", 3, "~23 oct", 6],
    ["Cojín decorativo", 7, "~27 oct", 8],
    ["Taza cerámica Stockly", 21, "~8 nov", 4],
  ];
  return (
    <Novandra>
      <div className="cab">
        <i>✦</i>
        <div>
          <b>Novandra</b>
          <span>Asistente de operaciones · aprende de tu negocio</span>
        </div>
      </div>
      <div className="pregunta">
        <span className="texto">¿Qué productos debo reabastecer esta semana?</span>
      </div>
      <div className="pensando" aria-hidden="true">
        <i /> <i /> <i />
      </div>
      <div className="respuesta">
        <b>Por reponer (6):</b>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th>Se agota</th>
              <th>Pedir</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(([n, s, a, p]) => (
              <tr key={n}>
                <td>{n}</td>
                <td>{s}</td>
                <td>{a}</td>
                <td>
                  <b>{p}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="boton">Crear borrador de orden (6 productos)</span>
      </div>
    </Novandra>
  );
}
const Novandra = styled.div`
  background: ${TINTA2};
  border: 1px solid rgba(244, 241, 236, 0.1);
  border-radius: 20px;
  padding: 20px;
  color: ${PAPEL};
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.9rem;
  .cab {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(244, 241, 236, 0.1);
    i {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: ${MORADO_CLARO};
      color: ${TINTA};
      display: grid;
      place-items: center;
      font-style: normal;
      font-weight: 800;
    }
    b {
      display: block;
    }
    span {
      font-size: 0.78rem;
      color: rgba(244, 241, 236, 0.6);
    }
  }
  .pregunta {
    align-self: flex-end;
    background: ${MORADO_CLARO};
    color: ${TINTA};
    border-radius: 14px 14px 4px 14px;
    padding: 9px 13px;
    font-weight: 600;
    max-width: 100%;
    overflow: hidden;
  }
  .texto {
    display: inline-block;
    vertical-align: bottom;
    @media (min-width: 640px) {
      white-space: nowrap;
      overflow: hidden;
      animation: ${escribir} ${CICLO} steps(42, end) infinite;
    }
  }
  .pensando {
    display: flex;
    gap: 5px;
    padding: 2px 4px;
    animation: ${pensar} ${CICLO} linear infinite;
    i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${MORADO_CLARO};
      animation: ${puntos} 1.2s ease-in-out infinite;
    }
    i:nth-child(2) {
      animation-delay: 0.15s;
    }
    i:nth-child(3) {
      animation-delay: 0.3s;
    }
  }
  .respuesta {
    background: ${TINTA};
    border-radius: 14px 14px 14px 4px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    opacity: 0;
    animation: ${respuesta} ${CICLO} ease-in-out infinite;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    th,
    td {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 1px solid rgba(244, 241, 236, 0.1);
    }
    th {
      color: rgba(244, 241, 236, 0.6);
      font-weight: 600;
    }
  }
  .boton {
    align-self: flex-start;
    background: ${MORADO_CLARO};
    color: ${TINTA};
    border-radius: 10px;
    padding: 8px 12px;
    font-weight: 700;
    font-size: 0.82rem;
  }
`;

// Cinta deslizante con lo que incluye Stockly.
export function Cinta({ items }) {
  const lista = [...items, ...items];
  return (
    <CintaBase aria-hidden="true">
      <div className="pista">
        {lista.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </CintaBase>
  );
}
const CintaBase = styled.div`
  overflow: hidden;
  padding: 6px 0;
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  .pista {
    display: flex;
    gap: 14px;
    width: max-content;
    animation: ${desplazar} 40s linear infinite;
  }
  span {
    white-space: nowrap;
    font-weight: 600;
    color: ${TINTA};
    font-size: 0.88rem;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid ${LINEA};
    background: #fff;
  }
`;


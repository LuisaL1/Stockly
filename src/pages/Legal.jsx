import styled from "styled-components";
import { Link } from "react-router-dom";
import { CORREO_STOCKLY } from "../utils/marca";
import { v } from "../styles/variables";

// Datos legales de MCCore (revisar los textos con un abogado antes de publicar).
const EMPRESA = {
  razonSocial: "MCCore",
  nit: "1005233408",
  direccion: "Quimbaya, Quindío, Colombia",
  correo: CORREO_STOCKLY,
  actualizado: "octubre de 2026",
};

function Documento({ titulo, children }) {
  return (
    <Container>
      <header>
        <Link to="/login" className="marca">
          <img src={v.logo} alt="" /> Stockly
        </Link>
        <Link to="/login" className="volver">
          Volver
        </Link>
      </header>
      <article>
        <h1>{titulo}</h1>
        <p className="fecha">Última actualización: {EMPRESA.actualizado}</p>
        {children}
      </article>
    </Container>
  );
}

export const TITULO_TERMINOS = "Términos y condiciones del servicio";
export const TITULO_PRIVACIDAD = "Política de tratamiento de datos personales";

// Estilos del texto legal, para usarlo dentro de una ventana.
export const TextoLegal = styled.div`
  line-height: 1.65;
  font-size: 0.92rem;
  h2 {
    margin: 18px 0 6px;
    font-size: 1rem;
  }
  ul {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  a {
    color: ${({ theme }) => theme.primary};
  }
`;

export function Terminos() {
  return (
    <Documento titulo={TITULO_TERMINOS}>
      <TextoTerminos />
    </Documento>
  );
}

export function Privacidad() {
  return (
    <Documento titulo={TITULO_PRIVACIDAD}>
      <TextoPrivacidad />
    </Documento>
  );
}

// Contenido de los documentos (se usa en la página y en la ventana del registro).
export function TextoTerminos() {
  return (
    <>
      <p>
        Estos términos regulan el uso de Stockly, el software de inventario, ventas y facturación ofrecido por {EMPRESA.razonSocial},
        NIT {EMPRESA.nit} (“MCCore”). Al crear una cuenta aceptas estos términos.
      </p>
      <h2>1. El servicio</h2>
      <p>
        Stockly es un software en la nube para registrar productos, inventario, ventas, compras, clientes y reportes. Las funciones
        marcadas como “próximamente” no hacen parte del servicio contratado hasta que estén disponibles. La factura que genera
        Stockly es un comprobante interno; la factura electrónica ante la DIAN solo aplica cuando esa función esté activa y
        configurada con un proveedor tecnológico autorizado.
      </p>
      <h2>2. Cuenta y responsabilidad</h2>
      <p>
        Eres responsable de la información que registras, de la exactitud de tus datos tributarios y de las personas a las que das
        acceso. Debes cuidar tu contraseña y avisarnos de cualquier uso no autorizado a {EMPRESA.correo}.
      </p>
      <h2>3. Planes, prueba y precios</h2>
      <ul>
        <li>El plan Básico es gratuito, con los límites publicados en la app.</li>
        <li>Cada empresa puede probar el plan Enterprise gratis por 7 días, una sola vez, registrando una tarjeta o Nequi en Wompi. El medio de pago solo se valida: no se debita ningún valor durante la prueba ni al terminarla. Al terminar, la empresa pasa sola al plan Básico gratis, conserva todos sus datos y puede comprar un plan pagado cuando quiera.</li>
        <li>
          Los planes Pro y Enterprise se pagan por mes o por año, por anticipado. Los precios publicados son finales: MCCore no es
          responsable de IVA, por lo que no se cobra IVA. Si esto cambia, lo informaremos antes de la siguiente renovación.
        </li>
        <li>La primera compra de cada empresa puede tener el descuento promocional publicado en la app al momento de pagar.</li>
        <li>Podemos cambiar los precios avisando con al menos 30 días de anticipación; el cambio aplica en la siguiente renovación.</li>
      </ul>
      <h2>4. Pagos y renovación</h2>
      <p>
        Los pagos se procesan con Wompi (Bancolombia). Stockly no almacena los datos de tu tarjeta. El plan no se renueva
        automáticamente: antes del vencimiento te avisamos para que pagues la renovación. Si no renuevas, la empresa pasa al plan
        Básico y conserva sus datos.
      </p>
      <h2>5. Derecho de retracto y reembolsos</h2>
      <p>
        Si eres consumidor, puedes retractarte de la compra dentro de los cinco (5) días hábiles siguientes al pago, según el
        artículo 47 de la Ley 1480 de 2011, escribiendo a {EMPRESA.correo}. Te devolveremos el valor pagado dentro de los treinta (30)
        días calendario siguientes. Fuera de ese plazo, los periodos pagados no son reembolsables, pero puedes seguir usando el
        plan hasta su vencimiento.
      </p>
      <h2>6. Tus datos</h2>
      <p>
        La información de tu negocio es tuya. Puedes exportarla en Excel o eliminarla desde la app en cualquier momento. El
        tratamiento de datos personales se rige por nuestra{" "}
        <a href="/privacidad" target="_blank" rel="noreferrer">
          Política de tratamiento de datos personales
        </a>
        .
      </p>
      <h2>7. Disponibilidad y soporte</h2>
      <p>
        Trabajamos para que Stockly esté disponible todo el tiempo, pero puede haber interrupciones por mantenimiento o fallas de
        terceros. El soporte se presta desde la app y en {EMPRESA.correo}.
      </p>
      <h2>8. Uso permitido</h2>
      <p>
        No puedes usar Stockly para actividades ilegales, intentar acceder a datos de otras empresas ni afectar el funcionamiento del
        servicio. Podemos suspender cuentas que incumplan estos términos.
      </p>
      <h2>9. Responsabilidad</h2>
      <p>
        Stockly es una herramienta de apoyo: las decisiones contables, tributarias y comerciales son de cada empresa. La
        responsabilidad de MCCore se limita al valor pagado por el servicio en los últimos tres meses.
      </p>
      <h2>10. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de Colombia. Contacto: {EMPRESA.correo} · {EMPRESA.direccion}.
      </p>
    </>
  );
}

export function TextoPrivacidad() {
  return (
    <>
      <p>
        En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, {EMPRESA.razonSocial}, NIT {EMPRESA.nit}, con domicilio en{" "}
        {EMPRESA.direccion} y correo {EMPRESA.correo}, es responsable del tratamiento de los datos personales que recoge Stockly.
      </p>
      <h2>1. Datos que tratamos</h2>
      <ul>
        <li>De quienes usan Stockly: nombre, documento, correo, teléfono, dirección y datos de acceso.</li>
        <li>De la empresa: nombre, NIT, sector, ciudad, datos de facturación y de pago (sin datos de tarjetas).</li>
        <li>
          Los datos que cada empresa registra de sus clientes, proveedores y empleados. Sobre estos, la empresa es responsable y MCCore
          actúa como encargado del tratamiento.
        </li>
        <li>Datos técnicos de uso (pantallas, navegador) para soporte, seguridad y mejora del servicio.</li>
      </ul>
      <h2>2. Finalidades</h2>
      <p>
        Prestar el servicio; crear y administrar cuentas; procesar pagos de suscripción; enviar facturas, recordatorios y avisos del
        servicio; dar soporte; prevenir fraude y garantizar la seguridad; y cumplir obligaciones legales. Solo enviaremos mensajes
        comerciales si lo autorizas, y podrás dejar de recibirlos cuando quieras.
      </p>
      <h2>3. Derechos del titular</h2>
      <p>
        Puedes conocer, actualizar, rectificar y suprimir tus datos, solicitar prueba de la autorización, ser informado del uso que se
        les da, revocar la autorización y presentar quejas ante la Superintendencia de Industria y Comercio.
      </p>
      <h2>4. Cómo ejercer tus derechos</h2>
      <p>
        Escribe a {EMPRESA.correo} indicando tu nombre, documento y solicitud. Responderemos consultas en máximo diez (10) días hábiles y
        reclamos en máximo quince (15) días hábiles, según la ley.
      </p>
      <h2>5. Proveedores que procesan datos</h2>
      <p>
        Para prestar el servicio usamos proveedores que tratan datos por cuenta de MCCore: Supabase (base de datos y autenticación,
        con servidores en Estados Unidos), Wompi (pagos), Brevo (correos) y Anthropic (asistente con inteligencia artificial, cuando
        esté activo). Al aceptar esta política autorizas la transferencia y transmisión internacional de datos necesaria para ello,
        con medidas de seguridad adecuadas.
      </p>
      <h2>6. Seguridad y conservación</h2>
      <p>
        Los datos de cada empresa están aislados del resto, viajan cifrados y solo acceden las personas que la empresa autoriza.
        Conservamos los datos mientras la cuenta esté activa y el tiempo que exija la ley; cuando la empresa los elimina desde la app,
        se borran de forma definitiva, salvo el registro de auditoría.
      </p>
      <h2>7. Vigencia</h2>
      <p>Esta política rige desde su publicación. Cualquier cambio importante se avisará en la app o por correo.</p>
    </>
  );
}

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 820px;
    margin: 0 auto;
    padding: 20px 16px;
  }
  .marca {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 1.1rem;
    text-decoration: none;
    color: inherit;
    img {
      width: 28px;
      height: 28px;
    }
  }
  .volver {
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
    text-decoration: none;
  }
  article {
    max-width: 820px;
    margin: 0 auto 60px;
    padding: 28px 24px;
    border-radius: ${({ theme }) => theme.radiusXl};
    background: ${({ theme }) => theme.surface};
    border: 1px solid ${({ theme }) => theme.border};
    line-height: 1.65;
    font-size: 0.95rem;
  }
  h1 {
    font-size: 1.6rem;
    line-height: 1.25;
  }
  .fecha {
    margin: 6px 0 18px;
    color: ${({ theme }) => theme.textMuted};
    font-size: 0.85rem;
  }
  h2 {
    margin: 22px 0 6px;
    font-size: 1.05rem;
  }
  ul {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  a {
    color: ${({ theme }) => theme.primary};
  }
`;

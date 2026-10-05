import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import QRCode from "qrcode";
import { useQueryClient } from "@tanstack/react-query";
import { Boton } from "../../atomos/Boton";
import { EstadoQRNequi, GenerarQRNequi } from "../../../supabase/crudVentas";
import { v } from "../../../styles/variables";

const CONSULTA_MS = 4000;

// QR dinámico de Nequi para una venta: lo genera, lo muestra y consulta a Nequi hasta que confirma el pago.
export function PagoNequiQR({ idVenta, dinero, onPagado }) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState("generando"); // generando | esperando | pagado | vencido | error
  const [imagen, setImagen] = useState(null);
  const [monto, setMonto] = useState(null);
  const [expira, setExpira] = useState(null);
  const [error, setError] = useState(null);
  const [restante, setRestante] = useState(null);
  const onPagadoRef = useRef(onPagado);
  onPagadoRef.current = onPagado;

  const generar = useCallback(async () => {
    setEstado("generando");
    setError(null);
    const r = await GenerarQRNequi(idVenta);
    if (r.error) {
      setError(r.error);
      return setEstado("error");
    }
    if (r.estado === "pagado") return setEstado("pagado");
    setImagen(await QRCode.toDataURL(r.qr, { width: 280, margin: 1, color: { dark: "#17131D", light: "#FFFFFF" } }));
    setMonto(r.monto);
    setExpira(r.expira ? new Date(r.expira).getTime() : null);
    setEstado("esperando");
  }, [idVenta]);

  useEffect(() => {
    generar();
  }, [generar]);

  // Consulta a Nequi mientras se espera el pago.
  useEffect(() => {
    if (estado !== "esperando") return;
    let activo = true;
    const consultar = async () => {
      const r = await EstadoQRNequi(idVenta);
      if (!activo) return;
      if (r.estado === "pagado") {
        setEstado("pagado");
        queryClient.invalidateQueries();
        onPagadoRef.current?.();
      } else if (r.estado === "vencido") {
        setEstado("vencido");
      } else if (r.estado === "revisar") {
        setError(r.detalle ?? "Nequi reportó un pago que no coincide con la venta. Revísalo antes de entregar.");
        setEstado("error");
      }
    };
    const id = setInterval(consultar, CONSULTA_MS);
    return () => {
      activo = false;
      clearInterval(id);
    };
  }, [estado, idVenta, queryClient]);

  // Cuenta regresiva de vigencia del QR.
  useEffect(() => {
    if (estado !== "esperando" || !expira) return;
    const tic = () => {
      const s = Math.max(0, Math.round((expira - Date.now()) / 1000));
      setRestante(s);
      if (s === 0) setEstado("vencido");
    };
    tic();
    const id = setInterval(tic, 1000);
    return () => clearInterval(id);
  }, [estado, expira]);

  return (
    <Container $estado={estado}>
      {estado === "generando" && (
        <div className="centro">
          <span className="spinner" />
          <p>Generando el QR con Nequi…</p>
        </div>
      )}

      {estado === "esperando" && (
        <>
          <div className="qr">
            <img src={imagen} alt="Código QR de Nequi para pagar" />
          </div>
          <div className="info">
            <strong>{dinero(monto)}</strong>
            <span>El cliente escanea con la app Nequi y paga.</span>
            <span className="espera">
              <span className="punto" /> Esperando confirmación de Nequi
              {restante != null && ` · vence en ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}`}
            </span>
          </div>
        </>
      )}

      {estado === "pagado" && (
        <div className="centro">
          <span className="check">
            <v.iconolisto />
          </span>
          <strong>Pago confirmado por Nequi</strong>
          <p>La factura quedó pagada. Ya puedes entregar el pedido.</p>
        </div>
      )}

      {estado === "vencido" && (
        <div className="centro">
          <p>El QR venció sin pago confirmado.</p>
          <Boton icono={<v.iconocodigobarras />} funcion={generar}>
            Generar un QR nuevo
          </Boton>
        </div>
      )}

      {estado === "error" && (
        <div className="centro">
          <p className="error">{error}</p>
          <Boton variante="secundario" funcion={generar}>
            Reintentar
          </Boton>
        </div>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.radiusLg};
  border: 1.5px solid ${({ theme, $estado }) => ($estado === "pagado" ? theme.success : theme.border)};
  background: ${({ theme, $estado }) => ($estado === "pagado" ? theme.successSoft : theme.surface)};
  flex-wrap: wrap;
  .qr {
    padding: 10px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid ${({ theme }) => theme.border};
    img {
      display: block;
      width: 180px;
      height: 180px;
    }
  }
  .info {
    flex: 1 1 180px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    strong {
      font-size: 1.6rem;
      letter-spacing: -0.02em;
    }
    span {
      font-size: 0.85rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .espera {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: ${({ theme }) => theme.primary} !important;
  }
  .punto {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.primary};
    animation: latido 1.2s infinite ease-in-out;
  }
  @keyframes latido {
    50% {
      opacity: 0.25;
    }
  }
  .centro {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
    padding: 10px;
    p {
      font-size: 0.9rem;
      color: ${({ theme }) => theme.textMuted};
    }
    .error {
      color: ${({ theme }) => theme.danger};
    }
    strong {
      color: ${({ theme }) => theme.success};
      font-size: 1.05rem;
    }
  }
  .check {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: ${({ theme }) => theme.success};
    color: #ffffff;
    font-size: 28px;
  }
  .spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid ${({ theme }) => theme.primarySoft};
    border-top-color: ${({ theme }) => theme.primary};
    animation: girar 0.8s linear infinite;
  }
  @keyframes girar {
    to {
      transform: rotate(360deg);
    }
  }
`;

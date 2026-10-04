import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boton } from "../../atomos/Boton";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { GenerarLinkPago, MostrarVenta } from "../../../supabase/crudVentas";
import { MostrarConfigFacturacion } from "../../../supabase/crudFacturacion";
import { abrirWhatsApp, mensajeFactura, numeroWhatsApp } from "../../../utils/whatsapp";
import { notificarAviso, notificarExito } from "../../../utils/notificaciones";
import { formatearMonedaCorta } from "../../../utils/conversiones";
import { v } from "../../../styles/variables";

// Envío de la factura por WhatsApp y link de pago de Wompi para el saldo pendiente.
// generarAlCargar: crea el link apenas se muestra (venta recién cobrada con "Link de pago").
export function EnviarFactura({ idVenta, generarAlCargar = false }) {
  const { dataempresa } = useEmpresaStore();
  const queryClient = useQueryClient();
  const [generando, setGenerando] = useState(false);
  const [telefono, setTelefono] = useState(null);

  const venta = useQuery({ queryKey: ["venta", idVenta], queryFn: () => MostrarVenta(idVenta) });
  const cfg = useQuery({
    queryKey: ["config facturacion", dataempresa?.id],
    queryFn: () => MostrarConfigFacturacion(dataempresa.id),
    enabled: !!dataempresa?.id,
  });

  const v_ = venta.data;
  const pagos = v_?.pagos_venta ?? [];
  const pagado = pagos.filter((p) => p.estado === "aprobado").reduce((a, p) => a + Number(p.monto), 0);
  const saldo = v_ ? Math.max(Number(v_.total) - pagado, 0) : 0;
  const link = pagos.find((p) => p.metodo === "link_pago" && p.estado === "pendiente" && p.link_url)?.link_url;
  const puedeLink = cfg.data?.wompi_activo && saldo > 0 && v_?.estado !== "anulada";
  const dinero = (n) => formatearMonedaCorta(n, dataempresa?.simbolomoneda ?? "$");

  async function generar() {
    setGenerando(true);
    const r = await GenerarLinkPago(idVenta);
    setGenerando(false);
    if (r.error) return notificarAviso("No se pudo crear el link de pago", r.error);
    await queryClient.invalidateQueries({ queryKey: ["venta", idVenta] });
    notificarExito(r.reutilizado ? "El link de pago sigue vigente" : "Link de pago creado");
  }

  // Venta cobrada con "Link de pago": se crea una sola vez apenas cargan los datos.
  const autoIntentado = useRef(false);
  const listoParaLink = generarAlCargar && !!v_ && !!cfg.data && puedeLink && !link;
  useEffect(() => {
    if (!listoParaLink || autoIntentado.current) return;
    autoIntentado.current = true;
    generar();
    // generar solo depende de idVenta, que no cambia mientras el componente existe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listoParaLink]);

  if (venta.isLoading) return <Boton variante="secundario" cargando disabled>Cargando…</Boton>;
  if (!v_) return null;

  const numero = telefono ?? v_.clientes?.telefono ?? "";
  const enviar = () => abrirWhatsApp(numero, mensajeFactura({ venta: v_, empresa: dataempresa, cfg: cfg.data, linkPago: link }));

  return (
    <Container>
      {saldo > 0 && v_.estado !== "anulada" && (
        <div className="link">
          <div>
            <span className="etiqueta">Saldo por pagar</span>
            <strong>{dinero(saldo)}</strong>
          </div>
          {link ? (
            <div className="url">
              <input value={link} readOnly aria-label="Link de pago" onFocus={(e) => e.target.select()} />
              <Boton
                variante="secundario"
                tamano="sm"
                icono={<v.iconolisto />}
                funcion={async () => {
                  await navigator.clipboard?.writeText(link);
                  notificarExito("Link copiado");
                }}
              >
                Copiar
              </Boton>
            </div>
          ) : puedeLink ? (
            <Boton tamano="sm" icono={<v.iconoenviar />} cargando={generando} funcion={generar}>
              Crear link de pago
            </Boton>
          ) : (
            <small>Conecta Wompi en Configuración → Facturación para cobrar con link de pago.</small>
          )}
        </div>
      )}

      <div className="whatsapp">
        <label>
          WhatsApp del cliente
          <input
            type="tel"
            inputMode="tel"
            placeholder="300 123 4567 (opcional)"
            value={numero}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </label>
        <Boton icono={<IconoWhatsApp />} funcion={enviar} className="boton-wa">
          Enviar por WhatsApp
        </Boton>
      </div>
      {!numeroWhatsApp(numero) && <small className="ayuda">Sin número, WhatsApp te deja elegir el contacto.</small>}
    </Container>
  );
}

function IconoWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden>
      <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.98L2 22l5.17-1.5A9.93 9.93 0 1 0 12.04 2Zm0 18.1a8.16 8.16 0 0 1-4.17-1.14l-.3-.18-3.07.89.9-3-.2-.31a8.2 8.2 0 1 1 6.84 3.74Zm4.5-6.12c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.71-1.33.08-.16.04-.3-.02-.43l-.75-1.8c-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.31 2.74 2.74 0 0 0-.86 2.04 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.69c1.56.67 2.17.73 2.95.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  .link {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border-radius: ${({ theme }) => theme.radiusLg};
    background: ${({ theme }) => theme.primarySoft};
    > div:first-child {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    strong {
      font-size: 1.2rem;
      color: ${({ theme }) => theme.primary};
    }
    small {
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .etiqueta {
    font-size: 0.75rem;
    font-weight: 600;
    color: ${({ theme }) => theme.textMuted};
  }
  .url {
    display: flex;
    gap: 8px;
    input {
      flex: 1;
      min-width: 0;
      height: 34px;
      padding: 0 10px;
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radiusSm};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      font-size: 0.82rem;
    }
  }
  .whatsapp {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-wrap: wrap;
    label {
      flex: 1 1 180px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: ${({ theme }) => theme.textMuted};
    }
    input {
      height: 42px;
      padding: 0 12px;
      border: 1px solid ${({ theme }) => theme.border};
      border-radius: ${({ theme }) => theme.radiusSm};
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
    }
  }
  .boton-wa {
    background: #25d366;
    color: #0b3d1e;
    &:hover:not(:disabled) {
      background: #1ebe5b;
    }
  }
  .ayuda {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.textMuted};
  }
`;

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boton } from "../../atomos/Boton";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { GenerarLinkPago, MostrarVenta, SubirFacturaCompartida } from "../../../supabase/crudVentas";
import { MostrarConfigFacturacion } from "../../../supabase/crudFacturacion";
import Swal from "sweetalert2";
import { abrirWhatsApp, compartirArchivo, esCompartirDirecto, mensajeFactura, mensajeLinkPago, numeroWhatsApp, urlWhatsApp } from "../../../utils/whatsapp";
import { crearArchivoFactura } from "../../../utils/facturaPdf";
import { useLogoEmpresa } from "../../../hooks/useLogoEmpresa";
import { notificarAviso, notificarError, notificarExito } from "../../../utils/notificaciones";
import { formatearMonedaCorta } from "../../../utils/conversiones";
import { v } from "../../../styles/variables";

// Envío de la factura en PDF por WhatsApp y link de pago de Wompi para el saldo pendiente.
// Celular: comparte el PDF directo (menú del teléfono). Computador: abre el chat con un enlace al PDF.
// generarAlCargar: crea el link apenas se muestra (venta recién cobrada con "Link de pago").
export function EnviarFactura({ idVenta, generarAlCargar = false }) {
  const { dataempresa } = useEmpresaStore();
  const queryClient = useQueryClient();
  const [generando, setGenerando] = useState(false);
  const [telefono, setTelefono] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const { logo: logoEmpresa, cargando: cargandoLogo } = useLogoEmpresa();
  const [directo] = useState(esCompartirDirecto);

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

  // En el celular el PDF se prepara antes del clic: el menú de compartir debe abrirse de inmediato.
  const datosListos = !!v_ && !!cfg.data && !cargandoLogo;
  const huella = `${v_?.id}-${v_?.estado}-${pagado}-${link ?? ""}`;
  const [archivo, setArchivo] = useState(null);
  useEffect(() => {
    if (!directo || !datosListos) return;
    let vigente = true;
    crearArchivoFactura({ venta: v_, cfg: cfg.data, empresa: dataempresa, logoEmpresa })
      .then((a) => vigente && setArchivo(a))
      .catch(() => vigente && setArchivo(null));
    return () => {
      vigente = false;
    };
    // Se regenera solo si cambia la venta (pagos, estado o link).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directo, datosListos, huella]);

  if (venta.isLoading) return <Boton variante="secundario" cargando disabled>Cargando…</Boton>;
  if (!v_) return null;

  const numero = telefono ?? v_.clientes?.telefono ?? "";
  const mensaje = () => mensajeFactura({ venta: v_, empresa: dataempresa, cfg: cfg.data, linkPago: link });

  const enviarLink = () => abrirWhatsApp(numero, mensajeLinkPago({ venta: v_, empresa: dataempresa, linkPago: link, saldo }));

  async function enviar() {
    // Celular: menú de compartir con el PDF adjunto.
    if (directo && archivo) {
      const r = await compartirArchivo(archivo, mensaje());
      // WhatsApp a veces envía solo el PDF y descarta el texto: se ofrece mandar el link de pago aparte.
      if (r === "compartido" && link && saldo > 0) {
        const { isConfirmed } = await Swal.fire({
          icon: "question",
          title: "¿Enviar también el link de pago?",
          text: "Así el cliente lo tiene a un toque para pagar, aunque WhatsApp no haya enviado el texto con el PDF.",
          showCancelButton: true,
          confirmButtonText: "Enviar link de pago",
          cancelButtonText: "No, gracias",
          confirmButtonColor: "#8800B3",
          reverseButtons: true,
        });
        if (isConfirmed) enviarLink();
      }
      if (r !== "fallo") return;
    }
    // Computador (o si el teléfono no deja compartir): la ventana se abre ya, con el clic,
    // para que el navegador no la bloquee, y se completa cuando el PDF esté listo.
    const ventana = window.open("about:blank", "_blank");
    setEnviando(true);
    try {
      const pdf = archivo ?? (await crearArchivoFactura({ venta: v_, cfg: cfg.data, empresa: dataempresa, logoEmpresa }));
      const url = await SubirFacturaCompartida({ idEmpresa: dataempresa.id, idVenta: v_.id, archivo: pdf });
      const destino = urlWhatsApp(numero, `${mensaje()}\n\n📄 Tu factura en PDF:\n${url}`);
      if (ventana) ventana.location.href = destino;
      else window.location.href = destino;
    } catch (e) {
      ventana?.close();
      notificarError("No se pudo enviar la factura", e.message);
    } finally {
      setEnviando(false);
    }
  }

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
                icono={<v.iconocopiar />}
                funcion={async () => {
                  await navigator.clipboard?.writeText(link);
                  notificarExito("Link copiado");
                }}
              >
                Copiar link
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
        <Boton icono={<IconoWhatsApp />} funcion={enviar} cargando={enviando || (directo && datosListos && !archivo)} className="boton-wa">
          Enviar PDF por WhatsApp
        </Boton>
      </div>
      {link && saldo > 0 && v_.estado !== "anulada" && (
        <Boton variante="secundario" icono={<IconoWhatsApp />} funcion={enviarLink}>
          Enviar solo el link de pago
        </Boton>
      )}
      <small className="ayuda">
        {directo
          ? `Se abre el menú de compartir con el PDF: elige WhatsApp y el contacto.${link && saldo > 0 ? " El link de pago va en el mensaje y dentro del PDF." : ""}`
          : numeroWhatsApp(numero)
            ? `Se abre el chat con el resumen${link && saldo > 0 ? ", el link de pago" : ""} y el enlace para descargar el PDF (válido 30 días).`
            : "Sin número, WhatsApp te deja elegir el contacto. El mensaje lleva el enlace del PDF (válido 30 días)."}
      </small>
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

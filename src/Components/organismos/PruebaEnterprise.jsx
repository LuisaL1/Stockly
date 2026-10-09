import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Swal from "sweetalert2";
import { Boton } from "../atomos/Boton";
import { ActivarPrueba, DatosPrueba } from "../../supabase/crudSuscripcion";
import { abrirTokenizacion } from "../../utils/wompiWidget";
import { formatearFecha } from "../../utils/conversiones";
import { notificarError } from "../../utils/notificaciones";
import { v } from "../../styles/variables";

// Prueba de Enterprise: la persona registra su tarjeta o Nequi en Wompi (sin cobro) y
// obtiene unos días con todo. Al terminar pasa al Básico: no hay cobro automático.
// abrirAlCargar: viene del registro con "Probar Enterprise" elegido; se abre el paso de la tarjeta.
export function PruebaEnterprise({ idEmpresa, estado, alActivar, abrirAlCargar, alAbrir }) {
  const [trabajando, setTrabajando] = useState(false);
  const dias = estado?.dias_prueba ?? 7;
  const disponible = !!estado?.prueba_disponible;
  const abierto = useRef(false);
  const empezarRef = useRef(null);

  useEffect(() => {
    if (!abrirAlCargar || abierto.current || !estado) return;
    abierto.current = true;
    alAbrir?.();
    if (disponible) empezarRef.current?.();
  }, [abrirAlCargar, estado, disponible, alAbrir]);

  if (!disponible) return null;

  async function empezar() {
    setTrabajando(true);
    try {
      const datos = await DatosPrueba(idEmpresa);
      // Modo pruebas (pagos apagados): se activa sin Wompi ni medio de pago.
      if (datos.modo_pruebas) {
        const r = await ActivarPrueba({ idEmpresa, token: null, tipo: null });
        await alActivar?.();
        setTrabajando(false);
        Swal.fire({
          icon: "success",
          title: "Prueba de Enterprise activa (modo pruebas)",
          html: `Tienes todo Enterprise hasta el <b>${formatearFecha(r.prueba_hasta)}</b>. No se pidió medio de pago.`,
          confirmButtonColor: "#8800B3",
        });
        return;
      }
      const enlaces = [
        datos.terminos && `<a href="${datos.terminos}" target="_blank" rel="noreferrer">términos de Wompi</a>`,
        datos.datos_personales && `<a href="${datos.datos_personales}" target="_blank" rel="noreferrer">autorización de datos personales</a>`,
      ].filter(Boolean);
      const { isConfirmed } = await Swal.fire({
        icon: "info",
        title: `Prueba Enterprise ${dias} días gratis`,
        html:
          `Registra tu tarjeta o Nequi en la ventana segura de Wompi. Solo la validamos: <b>no se debitará nada, ni hoy ni cuando termine la prueba</b>.` +
          `<br/><br/>Después de ${dias} días pasas solo al plan Básico gratis, con todos tus datos. Si te gusta Enterprise, lo compras cuando quieras desde Plan y suscripción.`,
        input: "checkbox",
        inputValue: 0,
        inputPlaceholder: `Acepto los ${enlaces.join(" y la ")}`,
        inputValidator: (valor) => (!valor ? "Debes aceptar para continuar" : undefined),
        showCancelButton: true,
        confirmButtonText: "Registrar medio de pago",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#8800B3",
        reverseButtons: true,
      });
      setTrabajando(false);
      if (!isConfirmed) return;

      await abrirTokenizacion(datos.llave_publica, async (fuente) => {
        Swal.fire({ title: "Activando tu prueba…", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
          const r = await ActivarPrueba({ idEmpresa, token: fuente.token, tipo: fuente.type });
          await alActivar?.();
          Swal.fire({
            icon: "success",
            title: "¡Tu prueba de Enterprise está activa!",
            html: `Tienes todo Enterprise hasta el <b>${formatearFecha(r.prueba_hasta)}</b>.<br/>Registraste ${r.medio_pago}: <b>no se hizo ni se hará ningún cobro</b>.<br/><br/>Al terminar pasas al plan Básico gratis y puedes comprar Enterprise cuando quieras.`,
            confirmButtonColor: "#8800B3",
          });
        } catch (e) {
          Swal.fire({ icon: "error", title: "No se pudo activar la prueba", text: e.message, confirmButtonColor: "#8800B3" });
        }
      });
    } catch (e) {
      setTrabajando(false);
      notificarError("No se pudo iniciar la prueba", e.message);
    }
  }

  empezarRef.current = empezar;

  return (
    <Banner>
      <span className="icono">
        <v.iconorayo />
      </span>
      <div className="texto">
        <strong>Prueba Enterprise {dias} días gratis</strong>
        <span>
          Todas las funciones y la capacidad de Enterprise. Registras tu tarjeta o Nequi en Wompi solo para validarla:{" "}
          <b>no se debita nada, ni al empezar ni al terminar</b>. Después pasas solo al Básico gratis y compras Enterprise cuando quieras.
        </span>
      </div>
      <Boton cargando={trabajando} icono={<v.iconotarjeta />} funcion={empezar}>
        Empezar prueba gratis
      </Boton>
    </Banner>
  );
}

const Banner = styled.section`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px 18px;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 2px solid ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primarySoft};
  .icono {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-size: 1.2rem;
  }
  .texto {
    flex: 1 1 320px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    strong {
      font-size: 1.05rem;
    }
    span {
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.92rem;
      line-height: 1.5;
    }
  }
`;

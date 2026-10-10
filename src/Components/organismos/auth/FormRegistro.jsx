import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { InputText } from "../formularios/InputText";
import { Boton } from "../../atomos/Boton";
import { CampoContrasena } from "./CampoContrasena";
import { CamposNegocio } from "./CamposNegocio";
import { Alerta, Encabezado, Enlace, FormAuth, PieAuth } from "./EstilosAuth";
import { MostrarPlanesPublicos, RegistrarCuenta } from "../../../supabase/crudRegistro";
import { formatearNumero } from "../../../utils/conversiones";
import { Modal } from "../../moleculas/Modal";
import { TITULO_PRIVACIDAD, TITULO_TERMINOS, TextoLegal, TextoPrivacidad, TextoTerminos } from "../../../pages/Legal";
import { v } from "../../../styles/variables";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Borrador del registro: lo escrito se conserva si la persona recarga o sale un momento.
// Las contraseñas nunca se guardan.
const CLAVE_BORRADOR = "stockly_registro_borrador";
const leerBorrador = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_BORRADOR) ?? "null");
  } catch {
    return null;
  }
};
const guardarBorrador = (datos) => {
  try {
    sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento: el formulario sigue funcionando sin borrador.
  }
};
const borrarBorradorRegistro = () => {
  try {
    sessionStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    // Nada que borrar.
  }
};

// Enterprise en el registro = prueba de 7 días (tarjeta en Wompi, sin cobro). Al entrar se
// abre ese paso; al terminar pasa al Básico y, si quiere, lo compra desde Plan y suscripción.
const PLAN_PRUEBA = "empresa";
const PRUEBA = "prueba_enterprise";

const PASOS = [
  { titulo: "Tu cuenta", campos: ["nombres", "documento", "email", "pass", "confirmar"] },
  { titulo: "Tu negocio", campos: ["empresa", "sector", "ciudad"] },
  { titulo: "Tu plan", campos: ["terminos"] },
];

const resumenPlan = (p) =>
  [
    `${formatearNumero(p.limite_productos)} productos`,
    `${formatearNumero(p.limite_ventas_mes)} ventas/mes`,
    `${p.limite_bodegas} bodega${p.limite_bodegas === 1 ? "" : "s"}`,
    p.factura_electronica ? "factura electrónica" : "factura en PDF",
  ].join(" · ");

// Registro en tres pasos: cuenta, negocio y plan.
export function FormRegistro({ irA, alRegistrar }) {
  const [borrador] = useState(leerBorrador);
  // El paso se conserva, pero si había avanzado vuelve al primero: las contraseñas no se guardan.
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState(null);
  const [documento, setDocumento] = useState(null); // "terminos" | "privacidad"
  const [verCodigo, setVerCodigo] = useState(false);
  const planes = useQuery({ queryKey: ["planes publicos"], queryFn: MostrarPlanesPublicos, staleTime: 3_600_000 });

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    shouldUnregister: false,
    defaultValues: { moneda: "$", plan: "basico", ciclo: "mensual", terminos: false, sector: "", ...(borrador?.datos ?? {}) },
  });
  // Guarda el borrador mientras escribe (sin contraseñas).
  useEffect(() => {
    const suscripcion = watch((valores) => {
      const { pass: _p, confirmar: _c, ...resto } = valores;
      guardarBorrador({ datos: resto });
    });
    return () => suscripcion.unsubscribe();
  }, [watch]);
  const pass = watch("pass");
  const planElegido = watch("plan");
  // Con código promocional, el código manda: al entrar se activa (no se paga ni se abre la prueba).
  const codigo = (watch("codigo") ?? "").trim();
  const esPrueba = !codigo && planElegido === PLAN_PRUEBA;
  const planDePago = !codigo && !esPrueba && !!(planes.data ?? []).find((p) => p.id === planElegido && Number(p.precio_mensual) > 0);
  const anual = watch("ciclo") === "anual";

  async function siguiente() {
    if (await trigger(PASOS[paso].campos)) setPaso(paso + 1);
  }

  async function crear(d) {
    setError(null);
    const email = d.email.trim().toLowerCase();
    try {
      const { confirmarCorreo } = await RegistrarCuenta({
        email,
        pass: d.pass,
        registro: {
          nombres: d.nombres.trim(),
          documento: d.documento.trim(),
          telefono: d.telefono?.trim() || null,
          empresa: d.empresa.trim(),
          nit: d.nit?.trim() || null,
          sector: d.sector,
          ciudad: d.ciudad.trim(),
          moneda: d.moneda,
          plan: d.plan === PLAN_PRUEBA ? PRUEBA : d.plan,
          codigo: d.codigo?.trim().toUpperCase() || null,
          ciclo: d.ciclo,
        },
      });
      borrarBorradorRegistro();
      alRegistrar({ email, confirmarCorreo });
    } catch (e) {
      setError(e.message);
      // Si el correo ya existe, el usuario debe corregirlo en el primer paso.
      if (/correo/i.test(e.message)) setPaso(0);
    }
  }

  return (
    <>
      <Encabezado>
        <h1>Tu empresa, en Stockly.</h1>
        <p>Tres pasos. Y tu inventario, tus ventas y tus facturas en un solo lugar.</p>
      </Encabezado>

      <Pasos aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
        {PASOS.map((p, i) => (
          <li key={p.titulo} className={i < paso ? "hecho" : i === paso ? "actual" : ""}>
            <span className="numero">{i < paso ? <v.iconolisto /> : i + 1}</span>
            <span className="texto">{p.titulo}</span>
          </li>
        ))}
      </Pasos>

      {error && (
        <Alerta role="alert">
          <v.iconostockminimo />
          {error}
        </Alerta>
      )}

      <FormAuth
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (paso < PASOS.length - 1) siguiente();
          else handleSubmit(crear)(e);
        }}
      >
        {paso === 0 && (
          <>
            <div className="doble">
              <InputText label="Nombre completo" icono={<v.icononombre />} error={errors.nombres?.message}>
                <input
                  autoFocus
                  autoComplete="name"
                  placeholder="Ej. Pepito Pérez"
                  {...register("nombres", { validate: (t) => !!t?.trim() || "Escribe tu nombre" })}
                />
              </InputText>
              <InputText label="Cédula" icono={<v.iconodocumento />} error={errors.documento?.message}>
                <input
                  inputMode="numeric"
                  placeholder="Número de documento"
                  {...register("documento", {
                    validate: (t) => /^[0-9A-Za-z.-]{5,15}$/.test(t?.trim() ?? "") || "Escribe tu número de documento",
                  })}
                />
              </InputText>
            </div>
            <div className="doble">
              <InputText label="Correo" icono={<v.iconoemail />} error={errors.email?.message}>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  {...register("email", {
                    required: "Escribe tu correo",
                    pattern: { value: EMAIL, message: "El correo no es válido" },
                  })}
                />
              </InputText>
              <InputText label="Celular" icono={<v.iconotelefono />} ayuda="Opcional">
                <input type="tel" autoComplete="tel" placeholder="300 123 4567" {...register("telefono")} />
              </InputText>
            </div>
            <CampoContrasena
              medidor
              valor={pass}
              autoComplete="new-password"
              error={errors.pass?.message}
              {...register("pass", {
                required: "Crea una contraseña",
                minLength: { value: 8, message: "Mínimo 8 caracteres" },
                validate: (t) => (/[A-Za-z]/.test(t) && /\d/.test(t)) || "Combina letras y números",
              })}
            />
            <CampoContrasena
              label="Confirma la contraseña"
              autoComplete="new-password"
              error={
                errors.confirmar?.message ??
                (watch("confirmar") && watch("confirmar") !== pass ? "Las contraseñas no coinciden" : undefined)
              }
              {...register("confirmar", {
                validate: (t) => t === watch("pass") || "Las contraseñas no coinciden",
              })}
            />
          </>
        )}

        {paso === 1 && <CamposNegocio register={register} errors={errors} />}

        {paso === 2 && (
          <>
            <Ciclo role="group" aria-label="Ciclo de facturación">
              <button type="button" aria-pressed={!anual} onClick={() => setValue("ciclo", "mensual")}>
                Mensual
              </button>
              <button type="button" aria-pressed={anual} onClick={() => setValue("ciclo", "anual")}>
                Anual <small>2 meses gratis</small>
              </button>
            </Ciclo>
            <Planes role="radiogroup" aria-label="Plan">
              {(planes.data ?? []).map((p) => {
                const precio = anual ? p.precio_anual : p.precio_mensual;
                return (
                  <label key={p.id} className={planElegido === p.id ? "elegido" : ""}>
                    <input type="radio" value={p.id} {...register("plan")} />
                    <span className="radio" />
                    <span className="info">
                      <strong>
                        {p.nombre}
                        {p.destacado && <em>Recomendado</em>}
                        {p.id === PLAN_PRUEBA && <em>7 días gratis</em>}
                      </strong>
                      <small>{resumenPlan(p)}</small>
                    </span>
                    <span className="precio">
                      {p.id === PLAN_PRUEBA && planElegido === PLAN_PRUEBA ? (
                        <>
                          $0
                          <small className="luego">
                            7 días, luego ${formatearNumero(precio)}/{anual ? "año" : "mes"}
                          </small>
                        </>
                      ) : (
                        <>
                          {precio ? `$${formatearNumero(precio)}` : "Gratis"}
                          {precio ? <small>/{anual ? "año" : "mes"}</small> : null}
                        </>
                      )}
                    </span>
                  </label>
                );
              })}
              {planes.isLoading && <small>Cargando planes…</small>}
            </Planes>
            {verCodigo || codigo ? (
              <CodigoPromo>
                <span>Código promocional</span>
                <input
                  placeholder="STK-PRO-XXXXXX"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={40}
                  {...register("codigo", { setValueAs: (t) => (t ?? "").toUpperCase() })}
                  onInput={(e) => (e.target.value = e.target.value.toUpperCase())}
                />
                <small>Se activa apenas entres a Stockly. No se cobra nada.</small>
              </CodigoPromo>
            ) : (
              <EnlaceCodigo type="button" onClick={() => setVerCodigo(true)}>
                ¿Tienes un código promocional?
              </EnlaceCodigo>
            )}
            <Terminos>
              <input type="checkbox" {...register("terminos", { validate: (t) => t || "Debes aceptar para continuar" })} />
              <span>
                Acepto los{" "}
                <button type="button" className="enlace-legal" onClick={() => setDocumento("terminos")}>
                  términos del servicio
                </button>{" "}
                y autorizo el tratamiento de mis datos según la{" "}
                <button type="button" className="enlace-legal" onClick={() => setDocumento("privacidad")}>
                  política de datos personales
                </button>{" "}
                de MCCore.
                {errors.terminos && <em>{errors.terminos.message}</em>}
              </span>
            </Terminos>
            <small style={{ color: "inherit", opacity: 0.7 }}>
              {codigo
                ? "Al entrar activamos tu código promocional. No se hará ningún cobro: al terminar la promoción pasas al plan Básico gratis con todos tus datos."
                : esPrueba
                ? "Al entrar registras tu tarjeta o Nequi en Wompi solo para validarla: no se debita nada, ni hoy ni al terminar. Después de 7 días pasas solo al plan Básico gratis y puedes comprar Enterprise cuando quieras."
                : planDePago
                ? "Al entrar te llevamos a pagar con Wompi (tarjeta, PSE, Nequi o Bancolombia), con el descuento de tu primera compra."
                : "Empiezas gratis. Desde Plan y suscripción puedes probar Enterprise 7 días sin costo."}
            </small>
          </>
        )}

        <Acciones>
          {paso > 0 && (
            <Boton variante="secundario" tamano="lg" funcion={() => setPaso(paso - 1)}>
              Atrás
            </Boton>
          )}
          <Boton
            type="submit"
            tamano="lg"
            bloque
            cargando={isSubmitting}
            icono={paso === PASOS.length - 1 ? <v.iconolisto /> : <v.iconoflechaderecha />}
          >
            {paso < PASOS.length - 1
              ? "Continuar"
              : codigo
                ? "Crear mi empresa y activar código"
                : esPrueba
                ? "Crear mi empresa y probar gratis"
                : planDePago
                  ? "Crear mi empresa y pagar"
                  : "Crear mi empresa"}
          </Boton>
        </Acciones>
      </FormAuth>
      {documento && (
        <Modal
          titulo={documento === "terminos" ? TITULO_TERMINOS : TITULO_PRIVACIDAD}
          subtitulo="Tu registro sigue aquí: cierra esta ventana para continuar."
          onClose={() => setDocumento(null)}
          ancho="720px"
          pie={
            <Boton
              funcion={() => {
                setValue("terminos", true, { shouldValidate: true });
                setDocumento(null);
              }}
            >
              Entendido, acepto
            </Boton>
          }
        >
          <TextoLegal>{documento === "terminos" ? <TextoTerminos /> : <TextoPrivacidad />}</TextoLegal>
        </Modal>
      )}

      <PieAuth>
        ¿Ya tienes cuenta?{" "}
        <Enlace type="button" onClick={() => irA("ingresar")}>
          Inicia sesión
        </Enlace>
      </PieAuth>
    </>
  );
}

const Pasos = styled.ol`
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 22px;
  li {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    color: ${({ theme }) => theme.textMuted};
    &::before {
      content: "";
      height: 4px;
      border-radius: 999px;
      background: ${({ theme }) => theme.surfaceAlt};
      order: -1;
    }
    &.actual,
    &.hecho {
      color: ${({ theme }) => theme.text};
      &::before {
        background: ${({ theme }) => theme.primary};
      }
    }
  }
  .numero {
    display: none;
  }
`;

const Ciclo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surfaceAlt};
  button {
    height: 36px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${({ theme }) => theme.textMuted};
    font-weight: 600;
    cursor: pointer;
    small {
      color: ${({ theme }) => theme.success};
      font-size: 0.72rem;
      margin-left: 4px;
    }
    &[aria-pressed="true"] {
      background: ${({ theme }) => theme.surface};
      color: ${({ theme }) => theme.text};
      box-shadow: ${({ theme }) => theme.shadow};
    }
  }
`;

const Planes = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  label {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 1.5px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radiusLg};
    background: ${({ theme }) => theme.surface};
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    &:hover {
      border-color: ${({ theme }) => theme.textMuted};
    }
    &.elegido {
      border-color: ${({ theme }) => theme.primary};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.primarySoft};
      .radio {
        border-color: ${({ theme }) => theme.primary};
        &::after {
          transform: scale(1);
        }
      }
    }
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  label:has(input:focus-visible) {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }
  .radio {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 2px solid ${({ theme }) => theme.border};
    &::after {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: ${({ theme }) => theme.primary};
      transform: scale(0);
      transition: transform 0.15s;
    }
  }
  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    strong {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    em {
      font-style: normal;
      font-size: 0.68rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: ${({ theme }) => theme.primary};
      color: ${({ theme }) => theme.onPrimary};
    }
    small {
      color: ${({ theme }) => theme.textMuted};
      font-size: 0.78rem;
    }
  }
  .precio {
    font-weight: 700;
    white-space: nowrap;
    text-align: right;
    small {
      font-weight: 500;
      color: ${({ theme }) => theme.textMuted};
    }
    .luego {
      display: block;
      font-size: 0.75rem;
    }
  }
`;

const EnlaceCodigo = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
`;

const CodigoPromo = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  span {
    font-size: 0.85rem;
    font-weight: 600;
  }
  input {
    height: 44px;
    padding: 0 14px;
    border: 1.5px dashed ${({ theme }) => theme.primary};
    border-radius: ${({ theme }) => theme.radiusLg};
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.text};
    font-family: ui-monospace, monospace;
    letter-spacing: 0.05em;
  }
  small {
    color: ${({ theme }) => theme.textMuted};
  }
`;

const Terminos = styled.label`
  .enlace-legal {
    display: inline;
    padding: 0;
    border: none;
    background: none;
    color: ${({ theme }) => theme.primary};
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  input {
    width: 18px;
    height: 18px;
    margin-top: 1px;
    accent-color: ${({ theme }) => theme.primary};
    flex-shrink: 0;
  }
  em {
    display: block;
    font-style: normal;
    color: ${({ theme }) => theme.danger};
    margin-top: 2px;
  }
`;

const Acciones = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
`;

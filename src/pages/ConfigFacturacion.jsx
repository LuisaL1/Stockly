import { useForm } from "react-hook-form";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { InputText } from "../Components/organismos/formularios/InputText";
import { Formulario } from "../Components/organismos/formularios/Formulario";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useEmpresaStore } from "../store/EmpresaStore";
import { usePlan } from "../hooks/usePlan";
import {
  GuardarConfigFacturacion,
  GuardarCredencialesNequi,
  GuardarCredencialesWompi,
  MostrarConfigFacturacion,
  MostrarEstadoNequi,
  MostrarEstadoWompi,
} from "../supabase/crudFacturacion";
import { Bancos, TiposLlaveBreB } from "../utils/dataEstatica";
import { notificarExito } from "../utils/notificaciones";
import { MODULOS } from "../utils/permisos";
import { Device } from "../styles/breackpoints";
import { v } from "../styles/variables";

const PROVEEDORES_DIAN = [
  { id: "", texto: "Selecciona un proveedor" },
  { id: "alegra", texto: "Alegra" },
  { id: "siigo", texto: "Siigo" },
  { id: "facture", texto: "Facture" },
  { id: "otro", texto: "Otro proveedor tecnológico" },
];
const nulo = (t) => (t === "" || t == null ? null : t);
const entero = (t) => (t === "" || t == null || Number.isNaN(Number(t)) ? null : Math.trunc(Number(t)));

export function ConfigFacturacion() {
  return (
    <ConPermiso modulo={MODULOS.facturacion}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const { plan, ajustes } = usePlan();
  // Funciones que se activan cuando estén listas (interruptores globales).
  const dianDisponible = ajustes?.factura_electronica_disponible === true;
  const nequiDisponible = ajustes?.nequi_qr_disponible === true;
  const cfg = useQuery({
    queryKey: ["config facturacion", dataempresa?.id],
    queryFn: () => MostrarConfigFacturacion(dataempresa.id),
    enabled: !!dataempresa?.id,
  });

  const wompi = useQuery({
    queryKey: ["estado wompi", dataempresa?.id],
    queryFn: () => MostrarEstadoWompi(dataempresa.id),
    enabled: !!dataempresa?.id,
  });
  const nequi = useQuery({
    queryKey: ["estado nequi", dataempresa?.id],
    queryFn: () => MostrarEstadoNequi(dataempresa.id),
    enabled: !!dataempresa?.id,
  });
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    values: cfg.data
      ? {
          ...cfg.data,
          proveedor_dian: cfg.data.proveedor_dian ?? "",
          wompi_llave_privada: "",
          wompi_secreto_eventos: "",
          nequi_client_id: "",
          nequi_client_secret: "",
          nequi_api_key: "",
          nequi_codigo_comercio: nequi.data?.codigo_comercio ?? "",
          nequi_ambiente: nequi.data?.ambiente ?? "pruebas",
        }
      : undefined,
  });

  if (cfg.isLoading) return <SpinnerLoader />;
  if (cfg.error) return <ErrorMolecula mensaje={cfg.error.message} reintentar={cfg.refetch} />;

  const permiteElectronica = !!plan?.factura_electronica && dianDisponible;
  const wompiActivo = watch("wompi_activo");
  const nequiActivo = watch("nequi_activo");
  const urlWebhook = `${import.meta.env.VITE_APP_SUPABASE_URL}/functions/v1/wompi-webhook`;
  const electronica = watch("electronica_activa");

  async function guardar(d) {
    const ok = await GuardarConfigFacturacion({
      id_empresa: dataempresa.id,
      razon_social: nulo(d.razon_social?.trim()),
      nit: nulo(d.nit?.trim()),
      regimen: nulo(d.regimen?.trim()),
      direccion: nulo(d.direccion?.trim()),
      telefono: nulo(d.telefono?.trim()),
      email: nulo(d.email?.trim()),
      prefijo: d.prefijo.trim().toUpperCase(),
      iva_defecto: Number(d.iva_defecto) || 0,
      nota_pie: nulo(d.nota_pie?.trim()),
      electronica_activa: permiteElectronica && !!d.electronica_activa,
      proveedor_dian: nulo(d.proveedor_dian),
      ambiente: d.ambiente,
      resolucion_numero: nulo(d.resolucion_numero?.trim()),
      resolucion_fecha: nulo(d.resolucion_fecha),
      rango_desde: entero(d.rango_desde),
      rango_hasta: entero(d.rango_hasta),
      breb_tipo_llave: nulo(d.breb_tipo_llave),
      breb_llave: nulo(d.breb_llave?.trim()),
      banco: nulo(d.banco),
      tipo_cuenta: nulo(d.tipo_cuenta),
      numero_cuenta: nulo(d.numero_cuenta?.trim()),
      titular_cuenta: nulo(d.titular_cuenta?.trim()),
      wompi_activo: !!d.wompi_activo,
      nequi_activo: nequiDisponible && !!d.nequi_activo,
      wompi_llave_publica: nulo(d.wompi_llave_publica?.trim()),
    });
    if (ok && (d.wompi_llave_privada?.trim() || d.wompi_secreto_eventos?.trim())) {
      const guardadas = await GuardarCredencialesWompi({
        idEmpresa: dataempresa.id,
        llavePrivada: d.wompi_llave_privada?.trim(),
        secretoEventos: d.wompi_secreto_eventos?.trim(),
      });
      if (guardadas) {
        wompi.refetch();
        notificarExito("Llaves de Wompi guardadas");
      }
    }
    const nequiCambio =
      d.nequi_client_id?.trim() ||
      d.nequi_client_secret?.trim() ||
      d.nequi_api_key?.trim() ||
      d.nequi_ambiente !== nequi.data?.ambiente ||
      (d.nequi_codigo_comercio?.trim() ?? "") !== (nequi.data?.codigo_comercio ?? "");
    if (ok && d.nequi_activo && nequiCambio) {
      const guardadas = await GuardarCredencialesNequi({
        idEmpresa: dataempresa.id,
        clientId: d.nequi_client_id?.trim(),
        clientSecret: d.nequi_client_secret?.trim(),
        apiKey: d.nequi_api_key?.trim(),
        ambiente: d.nequi_ambiente,
        codigoComercio: d.nequi_codigo_comercio?.trim(),
      });
      if (guardadas) {
        nequi.refetch();
        notificarExito("Credenciales de Nequi guardadas");
      }
    }
    if (ok) {
      reset(d);
      cfg.refetch();
    }
  }

  return (
    <PaginaTemplate
      titulo="Facturación"
      descripcion="Datos del emisor, numeración e impuestos de tus facturas."
      volverA={{ to: "/configurar", texto: "Configuración" }}
    >
      <Formulario onSubmit={handleSubmit(guardar)}>
        <Columnas>
          <Bloque>
            <h2>
              <v.iconoempresa /> Datos del emisor
            </h2>
            <div className="grid">
              <div className="completo">
                <InputText label="Razón social" icono={<v.icononombre />}>
                  <input {...register("razon_social")} />
                </InputText>
              </div>
              <InputText label="NIT" icono={<v.iconodocumento />}>
                <input placeholder="900123456-7" {...register("nit")} />
              </InputText>
              <InputText label="Régimen" icono={<v.iconolista />}>
                <input placeholder="Responsable de IVA" {...register("regimen")} />
              </InputText>
              <InputText label="Teléfono" icono={<v.iconotelefono />}>
                <input {...register("telefono")} />
              </InputText>
              <InputText label="Correo" icono={<v.iconoemail />}>
                <input type="email" {...register("email")} />
              </InputText>
              <div className="completo">
                <InputText label="Dirección" icono={<v.iconodireccion />}>
                  <input {...register("direccion")} />
                </InputText>
              </div>
            </div>
          </Bloque>

          <Bloque>
            <h2>
              <v.iconofacturas /> Numeración e impuestos
            </h2>
            <div className="grid">
              <InputText label="Prefijo" icono={<v.iconocodigointerno />} error={errors.prefijo?.message}>
                <input
                  maxLength={6}
                  {...register("prefijo", {
                    validate: (t) => /^[A-Za-z0-9]{1,6}$/.test(t?.trim() ?? "") || "De 1 a 6 letras o números",
                  })}
                />
              </InputText>
              <InputText label="Último número usado" icono={<v.iconocalculadora />} ayuda="Lo maneja Stockly al vender.">
                <input readOnly {...register("consecutivo")} />
              </InputText>
              <InputText label="IVA por defecto (%)" icono={<v.iconoporcentaje />} ayuda="Usa 0 si no eres responsable de IVA.">
                <input type="number" min="0" max="100" step="0.01" {...register("iva_defecto")} />
              </InputText>
              <div className="completo">
                <InputText label="Nota al pie de la factura" icono={<v.iconolista />}>
                  <textarea rows={2} placeholder="Ej. Gracias por tu compra. Cambios dentro de los 30 días." {...register("nota_pie")} />
                </InputText>
              </div>
            </div>
          </Bloque>
        </Columnas>

        <Columnas>
          <Bloque>
            <h2>
              <v.iconobreb /> Cobro con Bre-B
            </h2>
            <p className="ayuda">
              Con tu llave Bre-B te pueden pagar al instante desde cualquier banco o billetera (Nequi, Daviplata, Bancolombia y
              más). La llave se muestra en la caja, en la factura y en el mensaje de WhatsApp. La creas en la app de tu banco.
            </p>
            <div className="grid">
              <InputText label="Tipo de llave" icono={<v.iconolista />}>
                <select {...register("breb_tipo_llave")}>
                  <option value="">Selecciona…</option>
                  {TiposLlaveBreB.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.descripcion}
                    </option>
                  ))}
                </select>
              </InputText>
              <InputText label="Llave Bre-B" icono={<v.iconobreb />}>
                <input
                  placeholder={TiposLlaveBreB.find((t) => t.id === watch("breb_tipo_llave"))?.placeholder ?? "Tu llave"}
                  autoComplete="off"
                  {...register("breb_llave")}
                />
              </InputText>
            </div>
            <h3>
              <v.iconotransferencia /> Cuenta bancaria (opcional)
            </h3>
            <p className="ayuda">Por si el cliente prefiere una transferencia tradicional.</p>
            <div className="grid">
              <InputText label="Banco" icono={<v.iconotransferencia />}>
                <select {...register("banco")}>
                  <option value="">Selecciona…</option>
                  {Bancos.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </InputText>
              <InputText label="Tipo de cuenta" icono={<v.iconolista />}>
                <select {...register("tipo_cuenta")}>
                  <option value="">Selecciona…</option>
                  <option>Ahorros</option>
                  <option>Corriente</option>
                  <option>Depósito electrónico</option>
                </select>
              </InputText>
              <InputText label="Número de cuenta" icono={<v.iconocodigointerno />}>
                <input inputMode="numeric" {...register("numero_cuenta")} />
              </InputText>
              <InputText label="Titular" icono={<v.iconoUser />}>
                <input {...register("titular_cuenta")} />
              </InputText>
            </div>
          </Bloque>

          <Bloque>
            <div className="encabezado">
              <h2>
                <v.iconotarjeta /> Link de pago con Wompi
              </h2>
              <Etiqueta tono={wompi.data?.llave_privada ? "success" : "neutro"}>
                {wompi.data?.llave_privada
                  ? `Conectado · ${wompi.data.ambiente === "produccion" ? "Producción" : "Pruebas"}`
                  : "Sin conectar"}
              </Etiqueta>
            </div>
            <p className="ayuda">
              Tus clientes pagan con tarjeta, PSE o Nequi desde un link que les envías por WhatsApp. Las llaves están en el
              Dashboard de Comercios de Wompi → Desarrolladores. Las llaves privadas quedan guardadas en el servidor en una
              tabla que la app no puede leer, y nunca se vuelven a mostrar.
            </p>
            <label className="interruptor">
              <input type="checkbox" {...register("wompi_activo")} />
              Cobrar con link de pago de Wompi
            </label>
            {wompiActivo && (
              <div className="grid">
                <div className="completo">
                  <InputText label="Llave pública" icono={<v.iconopass />} ayuda="Empieza por pub_test_ o pub_prod_.">
                    <input placeholder="pub_prod_…" {...register("wompi_llave_publica")} />
                  </InputText>
                </div>
                <InputText
                  label="Llave privada"
                  icono={<v.iconopass />}
                  error={errors.wompi_llave_privada?.message}
                  ayuda={wompi.data?.llave_privada ? "Ya está guardada. Escribe una nueva solo para reemplazarla." : "Empieza por prv_test_ o prv_prod_."}
                >
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={wompi.data?.llave_privada ? "••••••••" : "prv_prod_…"}
                    {...register("wompi_llave_privada", {
                      validate: (t) => !t?.trim() || /^prv_(test|prod)_/.test(t.trim()) || "Debe empezar por prv_test_ o prv_prod_",
                    })}
                  />
                </InputText>
                <InputText
                  label="Secreto de eventos"
                  icono={<v.iconopass />}
                  error={errors.wompi_secreto_eventos?.message}
                  ayuda={wompi.data?.secreto_eventos ? "Ya está guardado." : "Empieza por test_events_ o prod_events_."}
                >
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={wompi.data?.secreto_eventos ? "••••••••" : "prod_events_…"}
                    {...register("wompi_secreto_eventos", {
                      validate: (t) => !t?.trim() || /^(test|prod)_events_/.test(t.trim()) || "Debe empezar por test_events_ o prod_events_",
                    })}
                  />
                </InputText>
                <div className="completo">
                  <InputText
                    label="URL de eventos (pégala en Wompi → Desarrolladores → URL de Eventos)"
                    icono={<v.iconoenviar />}
                    ayuda="Así Stockly marca la factura como pagada apenas el cliente paga."
                  >
                    <input value={urlWebhook} readOnly onFocus={(e) => e.target.select()} />
                  </InputText>
                  <button
                    type="button"
                    className="copiar"
                    title="Copiar la URL de eventos"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(urlWebhook);
                        notificarExito("URL de eventos copiada");
                      } catch {
                        notificarExito("Selecciona la URL y cópiala con Ctrl+C");
                      }
                    }}
                  >
                    <v.iconocopiar /> Copiar URL
                  </button>
                </div>
                <div className="completo guardar-bloque">
                  <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting} disabled={!isDirty}>
                    Guardar llaves de Wompi
                  </Boton>
                </div>
              </div>
            )}
          </Bloque>
        </Columnas>

        <Bloque>
          <div className="encabezado">
            <h2>
              <v.iconocodigobarras /> Cobro con QR de Nequi Negocios
            </h2>
            {nequiDisponible ? (
              <Etiqueta tono={nequi.data?.configurado ? "success" : "neutro"}>
                {nequi.data?.configurado ? `Conectado · ${nequi.data.ambiente === "produccion" ? "Producción" : "Pruebas"}` : "Sin conectar"}
              </Etiqueta>
            ) : (
              <Etiqueta tono="primary">Próximamente</Etiqueta>
            )}
          </div>
          <p className="ayuda">
            En la caja aparece un QR con el valor exacto de la venta. El cliente lo paga con su app Nequi y Stockly marca la
            factura como pagada apenas Nequi lo confirma: un pantallazo no sirve para engañar. Las credenciales están en
            las entrega Nequi al habilitar tu integración (developer.nequi.com.co → Solicita integración), y quedan
            guardadas en el servidor sin que la app pueda leerlas.
          </p>
          {!nequiDisponible && (
            <p className="ayuda">
              <strong>Muy pronto:</strong> estamos terminando la conexión con Nequi. Mientras tanto, cobra con Bre-B: también llega al
              instante desde cualquier banco o billetera.
            </p>
          )}
          <label className="interruptor">
            <input type="checkbox" disabled={!nequiDisponible} {...register("nequi_activo")} />
            Cobrar con QR de Nequi
          </label>
          {nequiDisponible && nequiActivo && (
            <div className="grid">
              <InputText label="Ambiente" icono={<v.iconorayo />}>
                <select {...register("nequi_ambiente")}>
                  <option value="pruebas">Pruebas (sandbox)</option>
                  <option value="produccion">Producción (cobros reales)</option>
                </select>
              </InputText>
              <InputText
                label="Código del comercio"
                icono={<v.iconoempresa />}
                ayuda="Tipo y número de identificación del comercio o de la caja que te asigna Nequi."
              >
                <input placeholder="El que te indique Nequi" {...register("nequi_codigo_comercio")} />
              </InputText>
              <InputText label="Client ID" icono={<v.iconopass />} ayuda={nequi.data?.configurado ? "Ya guardado. Escribe uno nuevo solo para cambiarlo." : undefined}>
                <input autoComplete="off" placeholder={nequi.data?.configurado ? "••••••••" : ""} {...register("nequi_client_id")} />
              </InputText>
              <InputText label="Client Secret" icono={<v.iconopass />}>
                <input type="password" autoComplete="off" placeholder={nequi.data?.configurado ? "••••••••" : ""} {...register("nequi_client_secret")} />
              </InputText>
              <InputText label="API Key" icono={<v.iconopass />}>
                <input type="password" autoComplete="off" placeholder={nequi.data?.configurado ? "••••••••" : ""} {...register("nequi_api_key")} />
              </InputText>
            </div>
          )}
        </Bloque>

        <Bloque className="dian">
          <div className="encabezado">
            <h2>
              <v.iconoenviar /> Factura electrónica DIAN
            </h2>
            <Etiqueta tono={!dianDisponible ? "primary" : permiteElectronica ? "info" : "neutro"}>
              {!dianDisponible ? "Próximamente" : permiteElectronica ? "Integración preparada" : "Disponible en Pro y Enterprise"}
            </Etiqueta>
          </div>
          <p className="ayuda">
            Stockly arma la factura y la entrega a tu proveedor tecnológico autorizado, que la valida ante la DIAN. La
            conexión con el proveedor está lista para activarse cuando tengas sus credenciales.
            {!dianDisponible && (
              <>
                {" "}
                <strong>Muy pronto</strong> podrás emitir facturas electrónicas desde Stockly. Mientras tanto, tus facturas salen
                en PDF y por WhatsApp.
              </>
            )}
            {dianDisponible && !permiteElectronica && (
              <>
                {" "}
                <Link to="/configurar/plan">Mejora tu plan</Link> para habilitarla.
              </>
            )}
          </p>
          <label className="interruptor">
            <input type="checkbox" disabled={!permiteElectronica} {...register("electronica_activa")} />
            Emitir mis facturas como electrónicas
          </label>
          {permiteElectronica && electronica && (
            <div className="grid">
              <InputText label="Proveedor tecnológico" icono={<v.iconoproveedores />}>
                <select {...register("proveedor_dian")}>
                  {PROVEEDORES_DIAN.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.texto}
                    </option>
                  ))}
                </select>
              </InputText>
              <InputText label="Ambiente" icono={<v.iconorayo />}>
                <select {...register("ambiente")}>
                  <option value="pruebas">Habilitación (pruebas)</option>
                  <option value="produccion">Producción</option>
                </select>
              </InputText>
              <InputText label="Número de resolución" icono={<v.iconodocumento />}>
                <input {...register("resolucion_numero")} />
              </InputText>
              <InputText label="Fecha de resolución" icono={<v.iconofecha />}>
                <input type="date" {...register("resolucion_fecha")} />
              </InputText>
              <InputText label="Rango desde" icono={<v.iconocodigointerno />}>
                <input type="number" min="1" {...register("rango_desde")} />
              </InputText>
              <InputText label="Rango hasta" icono={<v.iconocodigointerno />}>
                <input type="number" min="1" {...register("rango_hasta")} />
              </InputText>
            </div>
          )}
        </Bloque>

        {/* Barra fija abajo: siempre visible para no perder cambios en una página tan larga. */}
        <BarraGuardar $cambios={isDirty}>
          <span>{isDirty ? "Tienes cambios sin guardar" : "Todo guardado"}</span>
          <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting} disabled={!isDirty}>
            Guardar cambios
          </Boton>
        </BarraGuardar>
      </Formulario>
    </PaginaTemplate>
  );
}

const BarraGuardar = styled.div`
  position: sticky;
  bottom: 12px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 10px 18px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme, $cambios }) => ($cambios ? theme.primary : theme.border)};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  > span {
    font-size: 0.88rem;
    font-weight: 600;
    color: ${({ theme, $cambios }) => ($cambios ? theme.primary : theme.textMuted)};
  }
`;

const Columnas = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  @media ${Device.laptop} {
    grid-template-columns: 1fr 1fr;
  }
`;

const Bloque = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadow};
  h2,
  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.05rem;
    svg {
      color: ${({ theme }) => theme.primary};
    }
  }
  h3 {
    margin-top: 6px;
    padding-top: 16px;
    border-top: 1px solid ${({ theme }) => theme.border};
    font-size: 0.92rem;
  }
  .encabezado {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .ayuda {
    font-size: 0.88rem;
    color: ${({ theme }) => theme.textMuted};
    max-width: 760px;
    a {
      color: ${({ theme }) => theme.primary};
      font-weight: 600;
    }
  }
  .copiar {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${({ theme }) => theme.radiusSm};
    border: 1px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.primary};
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    &:hover {
      border-color: ${({ theme }) => theme.primary};
    }
  }
  .guardar-bloque {
    display: flex;
    justify-content: flex-end;
  }
  .interruptor {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    input {
      width: 18px;
      height: 18px;
      accent-color: ${({ theme }) => theme.primary};
    }
  }
`;

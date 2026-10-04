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
  GuardarCredencialesWompi,
  MostrarConfigFacturacion,
  MostrarEstadoWompi,
} from "../supabase/crudFacturacion";
import { Bancos } from "../utils/dataEstatica";
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
  const { plan } = usePlan();
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
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    values: cfg.data
      ? { ...cfg.data, proveedor_dian: cfg.data.proveedor_dian ?? "", wompi_llave_privada: "", wompi_secreto_eventos: "" }
      : undefined,
  });

  if (cfg.isLoading) return <SpinnerLoader />;
  if (cfg.error) return <ErrorMolecula mensaje={cfg.error.message} reintentar={cfg.refetch} />;

  const permiteElectronica = !!plan?.factura_electronica;
  const wompiActivo = watch("wompi_activo");
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
      banco: nulo(d.banco),
      tipo_cuenta: nulo(d.tipo_cuenta),
      numero_cuenta: nulo(d.numero_cuenta?.trim()),
      titular_cuenta: nulo(d.titular_cuenta?.trim()),
      wompi_activo: !!d.wompi_activo,
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
              <v.iconotransferencia /> Datos bancarios
            </h2>
            <p className="ayuda">Se muestran en la factura y en el mensaje de WhatsApp para que el cliente te transfiera.</p>
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
                </div>
              </div>
            )}
          </Bloque>
        </Columnas>

        <Bloque className="dian">
          <div className="encabezado">
            <h2>
              <v.iconoenviar /> Factura electrónica DIAN
            </h2>
            <Etiqueta tono={permiteElectronica ? "info" : "neutro"}>
              {permiteElectronica ? "Integración preparada" : "Disponible en Pro y Empresa"}
            </Etiqueta>
          </div>
          <p className="ayuda">
            Stockly arma la factura y la entrega a tu proveedor tecnológico autorizado, que la valida ante la DIAN. La
            conexión con el proveedor está lista para activarse cuando tengas sus credenciales.
            {!permiteElectronica && (
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

        <div className="acciones">
          <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting} disabled={!isDirty}>
            Guardar cambios
          </Boton>
        </div>
      </Formulario>
    </PaginaTemplate>
  );
}

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
  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.05rem;
    svg {
      color: ${({ theme }) => theme.primary};
    }
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

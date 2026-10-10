import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import styled from "styled-components";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { ConPermiso } from "../Components/moleculas/ConPermiso";
import { InputText } from "../Components/organismos/formularios/InputText";
import { Formulario } from "../Components/organismos/formularios/Formulario";
import { Boton } from "../Components/atomos/Boton";
import { useEmpresaStore } from "../store/EmpresaStore";
import { MODULOS } from "../utils/permisos";
import { useLogoEmpresa } from "../hooks/useLogoEmpresa";
import { MostrarConfigFacturacion, QuitarLogoEmpresa, SubirLogoEmpresa } from "../supabase/crudFacturacion";
import logoStockly from "../assets/logo.png";
import { notificarError, notificarExito } from "../utils/notificaciones";
import { v } from "../styles/variables";
import { Sectores, Monedas, MONEDA_PREDETERMINADA } from "../utils/dataEstatica";

export function Empresa() {
  return (
    <ConPermiso modulo={MODULOS.empresa}>
      <Contenido />
    </ConPermiso>
  );
}

function Contenido() {
  const { dataempresa, EditarEmpresa } = useEmpresaStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    values: {
      nombre: dataempresa?.nombre ?? "",
      // Solo se puede elegir una moneda disponible (hoy, COP).
      simbolomoneda: Monedas.some((m) => m.disponible && m.id === dataempresa?.simbolomoneda)
        ? dataempresa.simbolomoneda
        : MONEDA_PREDETERMINADA,
      nit: dataempresa?.nit ?? "",
      sector: dataempresa?.sector ?? "",
      ciudad: dataempresa?.ciudad ?? "",
      telefono: dataempresa?.telefono ?? "",
    },
  });

  async function guardar(data) {
    const ok = await EditarEmpresa({
      id: dataempresa.id,
      nombre: data.nombre.trim(),
      simbolomoneda: data.simbolomoneda,
      nit: data.nit.trim(),
      sector: data.sector,
      ciudad: data.ciudad.trim(),
      telefono: data.telefono.trim(),
    });
    if (ok) reset(data);
  }

  return (
    <PaginaTemplate
      titulo="Tu empresa"
      descripcion="Lo que verán tus clientes en facturas y reportes."
      volverA={{ to: "/configurar", texto: "Configuración" }}
    >
      <LogoEmpresa />
      <Tarjeta>
        <Formulario onSubmit={handleSubmit(guardar)}>
          <InputText label="Nombre de la empresa" icono={<v.iconoempresa />} error={errors.nombre?.message}>
            <input {...register("nombre", { validate: (t) => !!t?.trim() || "Escribe el nombre" })} />
          </InputText>
          <div className="grid">
            <InputText label="NIT" icono={<v.iconodocumento />}>
              <input placeholder="900123456-7" {...register("nit")} />
            </InputText>
            <InputText label="Sector" icono={<v.iconocategorias />}>
              <select {...register("sector")}>
                <option value="">Selecciona…</option>
                {Sectores.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </InputText>
            <InputText label="Ciudad" icono={<v.iconodireccion />}>
              <input {...register("ciudad")} />
            </InputText>
            <InputText label="Teléfono" icono={<v.iconotelefono />}>
              <input type="tel" {...register("telefono")} />
            </InputText>
          </div>
          <InputText label="Moneda" icono={<v.iconoprecioventa />} ayuda="Por ahora Stockly opera en pesos colombianos (COP).">
            <select {...register("simbolomoneda")}>
              {Monedas.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.disponible}>
                  {m.disponible ? m.descripcion : `${m.descripcion} · próximamente`}
                </option>
              ))}
            </select>
          </InputText>
          <div className="acciones">
            <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting} disabled={!isDirty}>
              Guardar cambios
            </Boton>
          </div>
        </Formulario>
      </Tarjeta>
    </PaginaTemplate>
  );
}

// Logo: aparece en las facturas, los reportes y el menú.
function LogoEmpresa() {
  const { dataempresa } = useEmpresaStore();
  const { logo, cargando } = useLogoEmpresa();
  const queryClient = useQueryClient();
  const entrada = useRef(null);
  const [trabajando, setTrabajando] = useState(false);

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["config facturacion", dataempresa?.id] });

  async function subir(archivo) {
    if (!archivo) return;
    setTrabajando(true);
    try {
      await SubirLogoEmpresa(dataempresa.id, archivo);
      await refrescar();
      notificarExito("Logo actualizado");
    } catch (e) {
      notificarError("No se pudo subir el logo", e.message);
    }
    setTrabajando(false);
    if (entrada.current) entrada.current.value = "";
  }

  async function quitar() {
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "¿Quitar el logo?",
      text: "Tus facturas volverán a mostrar solo el nombre de la empresa.",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8800B3",
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    setTrabajando(true);
    try {
      await QuitarLogoEmpresa(dataempresa.id);
      await refrescar();
      notificarExito("Logo eliminado");
    } catch (e) {
      notificarError("No se pudo quitar el logo", e.message);
    }
    setTrabajando(false);
  }

  return (
    <Tarjeta>
      <LogoCaja>
        <div
          className="vista"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            subir(e.dataTransfer.files?.[0]);
          }}
        >
          {logo?.url ? <img src={logo.url} alt={`Logo de ${dataempresa?.nombre ?? "la empresa"}`} /> : <v.iconoempresa />}
        </div>
        <div className="texto">
          <strong>Logo de tu empresa</strong>
          <small>
            Aparece al lado del nombre en tus facturas y reportes. Usa un PNG con fondo transparente si lo tienes; también sirven JPG,
            SVG o WebP. Lo ajustamos automáticamente.
          </small>
          <div className="botones">
            <Boton tamano="sm" icono={<v.iconosubir />} cargando={trabajando || cargando} funcion={() => entrada.current?.click()}>
              {logo?.url ? "Cambiar logo" : "Subir logo"}
            </Boton>
            {logo?.url && (
              <Boton tamano="sm" variante="fantasma" icono={<v.iconeliminarTabla />} disabled={trabajando} funcion={quitar}>
                Quitar
              </Boton>
            )}
          </div>
        </div>
        <input
          ref={entrada}
          type="file"
          hidden
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => subir(e.target.files?.[0])}
        />
      </LogoCaja>
      <VistaFactura logoUrl={logo?.url} />
    </Tarjeta>
  );
}

// Encabezado de la factura en miniatura, con la misma disposición del PDF.
function VistaFactura({ logoUrl }) {
  const { dataempresa } = useEmpresaStore();
  const cfg = useQuery({
    queryKey: ["config facturacion", dataempresa?.id],
    queryFn: () => MostrarConfigFacturacion(dataempresa.id),
    enabled: !!dataempresa?.id,
  });
  const c = cfg.data ?? {};
  const nit = c.nit || dataempresa?.nit;
  const contacto = [c.telefono || dataempresa?.telefono, c.email].filter(Boolean).join(" · ");
  return (
    <Vista>
      <span className="titulo">Así se verá en tu factura</span>
      <div className="hoja" aria-hidden>
        <div className="encabezado">
          <div className="emisor">
            <img src={logoUrl || logoStockly} alt="" className={logoUrl ? "logo" : "logo stockly"} />
            <div>
              <strong>{dataempresa?.nombre || "Tu empresa"}</strong>
              {c.razon_social && c.razon_social !== dataempresa?.nombre && <span>{c.razon_social}</span>}
              <span>{nit ? `NIT ${nit}` : "NIT de tu empresa"}</span>
              {(c.direccion || dataempresa?.ciudad) && <span>{c.direccion || dataempresa?.ciudad}</span>}
              {contacto && <span>{contacto}</span>}
            </div>
          </div>
          <div className="numero">
            <em>FACTURA DE VENTA</em>
            <strong>{c.prefijo || "FV"}-{(Number(c.consecutivo) || 0) + 1}</strong>
            <span>{new Date().toLocaleDateString("es-CO")}</span>
          </div>
        </div>
        <div className="tabla">
          <span />
        </div>
        <div className="linea" />
        <div className="linea corta" />
        <div className="pie">
          <img src={logoStockly} alt="" /> Generada con Stockly · MCCore
        </div>
      </div>
      {!logoUrl && <small>Sin logo, la factura usa el de Stockly.</small>}
    </Vista>
  );
}

const Vista = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => theme.border};
  .titulo {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.textMuted};
  }
  small {
    font-size: 0.76rem;
    color: ${({ theme }) => theme.textMuted};
  }
  /* La hoja es siempre blanca, como el PDF (también en modo oscuro). */
  .hoja {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px 22px 14px;
    border-radius: ${({ theme }) => theme.radius};
    border: 1px solid ${({ theme }) => theme.border};
    background: #ffffff;
    color: #17131d;
    box-shadow: ${({ theme }) => theme.shadow};
    font-family: Helvetica, Arial, sans-serif;
  }
  .encabezado {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }
  .emisor {
    display: flex;
    gap: 10px;
    min-width: 0;
    > div {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    strong {
      font-size: 0.95rem;
      margin-bottom: 2px;
    }
    span {
      font-size: 0.66rem;
      line-height: 1.35;
      color: #6b6472;
    }
  }
  .logo {
    height: 36px;
    max-width: 110px;
    object-fit: contain;
    object-position: left top;
    flex-shrink: 0;
    &.stockly {
      width: 36px;
    }
  }
  .numero {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
    em {
      font-style: normal;
      font-size: 0.56rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #8800b3;
    }
    strong {
      font-size: 1.05rem;
    }
    span {
      font-size: 0.62rem;
      color: #6b6472;
    }
  }
  .tabla {
    margin-top: 6px;
    height: 16px;
    border-radius: 3px;
    background: #17131d;
  }
  .linea {
    height: 6px;
    width: 100%;
    border-radius: 3px;
    background: #efebe5;
    &.corta {
      width: 60%;
    }
  }
  .pie {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    font-size: 0.56rem;
    color: #6b6472;
    img {
      width: 9px;
      height: 9px;
    }
  }
`;

const LogoCaja = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  .vista {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 160px;
    height: 96px;
    padding: 12px;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: ${({ theme }) => theme.radius};
    border: 1px dashed ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surfaceAlt};
    color: ${({ theme }) => theme.textMuted};
    font-size: 30px;
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  .texto {
    flex: 1 1 260px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    small {
      color: ${({ theme }) => theme.textMuted};
      line-height: 1.45;
    }
  }
  .botones {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
`;

const Tarjeta = styled.div`
  max-width: 680px;
  padding: 24px;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius};
  box-shadow: ${({ theme }) => theme.shadow};
`;

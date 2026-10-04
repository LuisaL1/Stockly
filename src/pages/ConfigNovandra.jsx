import styled from "styled-components";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { SpinnerLoader } from "../Components/moleculas/SpinnerLoader";
import { ErrorMolecula } from "../Components/moleculas/ErrorMolecula";
import { BloqueoPagina } from "../Components/moleculas/BloqueoPagina";
import { InputText } from "../Components/organismos/formularios/InputText";
import { Formulario } from "../Components/organismos/formularios/Formulario";
import { Boton } from "../Components/atomos/Boton";
import { useEmpresaStore } from "../store/EmpresaStore";
import { useUsuariosStore } from "../store/UsuariosStore";
import { GuardarConfigNovandra, MostrarConfigNovandra } from "../supabase/crudInteligencia";
import { esAdmin } from "../utils/permisos";
import { v } from "../styles/variables";

const OPCIONES = [
  {
    campo: "empleados_pueden_usar",
    titulo: "Los empleados pueden usar Novandra",
    texto: "Si lo desactivas, solo el dueño y los administradores podrán hablar con ella.",
  },
  {
    campo: "empleados_ven_costos",
    titulo: "Los empleados ven costos y márgenes",
    texto: "Si está desactivado, Novandra no revela precios de compra ni valor del inventario a los empleados.",
  },
  {
    campo: "puede_crear_ordenes",
    titulo: "Puede preparar órdenes de compra en borrador",
    texto: "Siempre quedan en borrador: una persona las revisa y las envía.",
  },
  {
    campo: "puede_crear_recordatorios",
    titulo: "Puede dejar recordatorios en la campana",
    texto: "Avisos para el equipo, por ejemplo “reabastecer antes del viernes”.",
  },
  {
    campo: "auditoria_activa",
    titulo: "Puede revisar la auditoría del equipo",
    texto: "Solo cuando le pregunta el dueño o un administrador. Nunca a un empleado.",
  },
];

export function ConfigNovandra() {
  const { datausuario } = useUsuariosStore();
  if (!esAdmin(datausuario)) return <BloqueoPagina modulo="Permisos de Novandra (solo dueño o administradores)" />;
  return <Contenido />;
}

function Contenido() {
  const { dataempresa } = useEmpresaStore();
  const cfg = useQuery({
    queryKey: ["novandra config", dataempresa?.id],
    queryFn: () => MostrarConfigNovandra(dataempresa.id),
    enabled: !!dataempresa?.id,
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm({
    values: cfg.data ?? {
      empleados_pueden_usar: true,
      empleados_ven_costos: false,
      puede_crear_ordenes: true,
      puede_crear_recordatorios: true,
      auditoria_activa: true,
      instrucciones: "",
    },
  });

  if (cfg.isLoading) return <SpinnerLoader />;
  if (cfg.error) return <ErrorMolecula mensaje={cfg.error.message} reintentar={cfg.refetch} />;

  async function guardar(d) {
    const p = {
      id_empresa: dataempresa.id,
      ...Object.fromEntries(OPCIONES.map((o) => [o.campo, !!d[o.campo]])),
      instrucciones: d.instrucciones?.trim() || null,
    };
    if (await GuardarConfigNovandra(p)) reset(d);
  }

  return (
    <PaginaTemplate
      titulo="Permisos de Novandra"
      descripcion="Novandra solo hace lo que tú autorices. Estos permisos se aplican en el servidor, en cada conversación."
      volverA={{ to: "/configurar", texto: "Configuración" }}
    >
      <Formulario onSubmit={handleSubmit(guardar)}>
        <Lista>
          {OPCIONES.map((o) => (
            <label key={o.campo}>
              <span className="texto">
                <strong>{o.titulo}</strong>
                <small>{o.texto}</small>
              </span>
              <input type="checkbox" role="switch" {...register(o.campo)} />
              <span className="interruptor" aria-hidden />
            </label>
          ))}
        </Lista>
        <Bloque>
          <InputText
            label="Instrucciones para Novandra"
            ayuda="Reglas de tu negocio que debe respetar siempre. Ej.: “Nunca sugieras descuentos mayores al 10%”, “Prioriza las lociones importadas”."
          >
            <textarea rows={4} maxLength={1500} {...register("instrucciones")} />
          </InputText>
        </Bloque>
        <div className="acciones">
          <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting} disabled={!isDirty}>
            Guardar permisos
          </Boton>
        </div>
      </Formulario>
    </PaginaTemplate>
  );
}

const Lista = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
  overflow: hidden;
  label {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    cursor: pointer;
    & + label {
      border-top: 1px solid ${({ theme }) => theme.border};
    }
  }
  .texto {
    flex: 1;
    display: flex;
    flex-direction: column;
    small {
      color: ${({ theme }) => theme.textMuted};
    }
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .interruptor {
    position: relative;
    width: 44px;
    height: 26px;
    flex-shrink: 0;
    border-radius: 999px;
    background: ${({ theme }) => theme.surfaceAlt};
    border: 1px solid ${({ theme }) => theme.border};
    transition: background 0.15s;
    &::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${({ theme }) => theme.surface};
      box-shadow: ${({ theme }) => theme.shadow};
      transition: transform 0.15s;
    }
  }
  input:checked + .interruptor {
    background: ${({ theme }) => theme.primary};
    border-color: ${({ theme }) => theme.primary};
    &::after {
      transform: translateX(18px);
    }
  }
  input:focus-visible + .interruptor {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }
`;

const Bloque = styled.div`
  padding: 20px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.surface};
`;

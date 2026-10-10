import styled from "styled-components";
import { useForm } from "react-hook-form";
import { PaginaTemplate } from "../Components/templatesReact/PaginaTemplate";
import { BentoGrid, Tarjeta } from "../Components/moleculas/Bento";
import { InputText } from "../Components/organismos/formularios/InputText";
import { Formulario } from "../Components/organismos/formularios/Formulario";
import { CampoContrasena } from "../Components/organismos/auth/CampoContrasena";
import { Boton } from "../Components/atomos/Boton";
import { Etiqueta } from "../Components/atomos/Etiqueta";
import { useUsuariosStore } from "../store/UsuariosStore";
import { useEmpresaStore } from "../store/EmpresaStore";
import { UserAuth } from "../context/contextoAuth";
import { CambiarContrasena } from "../supabase/crudRegistro";
import { notificarError, notificarExito } from "../utils/notificaciones";
import { formatearFecha } from "../utils/conversiones";
import { v } from "../styles/variables";

const DOCUMENTO = /^[0-9A-Za-z.-]{5,15}$/;

export function Perfil() {
  const { user } = UserAuth();
  const { datausuario, EditarPerfil } = useUsuariosStore();
  const { dataempresa } = useEmpresaStore();

  const datos = useForm({
    values: {
      nombres: datausuario?.nombres ?? "",
      nro_docum: datausuario?.nro_docum ?? "",
      telefono: datausuario?.telefono ?? "",
      direccion: datausuario?.direccion ?? "",
    },
  });
  const clave = useForm();

  async function guardarDatos(d) {
    const cambios = {
      nombres: d.nombres.trim(),
      nro_docum: d.nro_docum.trim(),
      telefono: d.telefono.trim(),
      direccion: d.direccion.trim(),
    };
    if (await EditarPerfil(cambios)) datos.reset(cambios);
  }

  async function guardarClave({ pass }) {
    try {
      await CambiarContrasena(pass);
      notificarExito("Contraseña actualizada");
      clave.reset({ pass: "", confirmar: "" });
    } catch (e) {
      notificarError("No se pudo cambiar la contraseña", e.message);
    }
  }

  const nombre = datausuario?.nombres || user?.email || "?";
  const err = datos.formState.errors;
  const errClave = clave.formState.errors;

  return (
    <PaginaTemplate titulo="Mi perfil" descripcion="Tus datos y la seguridad de tu cuenta.">
      <BentoGrid>
        <Tarjeta variante="tinta" col={4} colTablet={6} decoracion>
          <Identidad>
            <span className="avatar">{nombre.charAt(0).toUpperCase()}</span>
            <strong>{nombre}</strong>
            <span className="muted">{user?.email}</span>
            <Etiqueta tono="primary" icono={<v.iconoplan />}>
              {datausuario?.tipouser || "Usuario"}
            </Etiqueta>
            <dl>
              <div>
                <dt>Empresa</dt>
                <dd>{dataempresa?.nombre ?? "—"}</dd>
              </div>
              <div>
                <dt>Miembro desde</dt>
                <dd>{formatearFecha(datausuario?.fecharegistro ?? user?.created_at) || "—"}</dd>
              </div>
            </dl>
          </Identidad>
        </Tarjeta>

        <Tarjeta col={8} colTablet={6} titulo="Datos personales" icono={<v.iconoUser />}>
          <Formulario onSubmit={datos.handleSubmit(guardarDatos)} noValidate>
            <div className="grid">
              <InputText label="Nombre completo" icono={<v.icononombre />} error={err.nombres?.message}>
                <input
                  autoComplete="name"
                  {...datos.register("nombres", { validate: (t) => !!t?.trim() || "Escribe tu nombre" })}
                />
              </InputText>
              <InputText label="Cédula" icono={<v.iconodocumento />} error={err.nro_docum?.message}>
                <input
                  inputMode="numeric"
                  {...datos.register("nro_docum", {
                    validate: (t) => DOCUMENTO.test(t?.trim() ?? "") || "Escribe tu número de documento",
                  })}
                />
              </InputText>
              <InputText label="Celular" icono={<v.iconotelefono />}>
                <input type="tel" autoComplete="tel" {...datos.register("telefono")} />
              </InputText>
              <InputText label="Correo" icono={<v.iconoemail />} ayuda="Es tu usuario de acceso; no se puede cambiar aquí.">
                <input value={user?.email ?? ""} readOnly />
              </InputText>
              <div className="completo">
                <InputText label="Dirección" icono={<v.iconodireccion />}>
                  <input autoComplete="street-address" {...datos.register("direccion")} />
                </InputText>
              </div>
            </div>
            <div className="acciones">
              <Boton
                type="submit"
                icono={<v.iconoguardar />}
                cargando={datos.formState.isSubmitting}
                disabled={!datos.formState.isDirty}
              >
                Guardar cambios
              </Boton>
            </div>
          </Formulario>
        </Tarjeta>

        <Tarjeta col={12} titulo="Cambiar contraseña" subtitulo="Usa al menos 8 caracteres con letras y números." icono={<v.iconopass />}>
          <Formulario onSubmit={clave.handleSubmit(guardarClave)} noValidate>
            <div className="grid">
              <CampoContrasena
                label="Nueva contraseña"
                medidor
                valor={clave.watch("pass")}
                autoComplete="new-password"
                error={errClave.pass?.message}
                {...clave.register("pass", {
                  required: "Escribe la nueva contraseña",
                  minLength: { value: 8, message: "Mínimo 8 caracteres" },
                  validate: (t) => (/[A-Za-z]/.test(t) && /\d/.test(t)) || "Combina letras y números",
                })}
              />
              <CampoContrasena
                label="Confírmala"
                autoComplete="new-password"
                error={errClave.confirmar?.message}
                {...clave.register("confirmar", {
                  validate: (t) => t === clave.watch("pass") || "Las contraseñas no coinciden",
                })}
              />
            </div>
            <div className="acciones">
              <Boton type="submit" variante="secundario" icono={<v.iconopass />} cargando={clave.formState.isSubmitting}>
                Actualizar contraseña
              </Boton>
            </div>
          </Formulario>
        </Tarjeta>
      </BentoGrid>
    </PaginaTemplate>
  );
}

const Identidad = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  .avatar {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    margin-bottom: 8px;
    border-radius: 22px;
    background: ${({ theme }) => theme.accentLight};
    color: ${({ theme }) => theme.ink};
    font-size: 2rem;
    font-weight: 700;
  }
  strong {
    font-size: 1.3rem;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .muted {
    font-size: 0.88rem;
    margin-bottom: 6px;
    overflow-wrap: anywhere;
  }
  dl {
    width: 100%;
    margin-top: 16px;
    padding: 14px;
    border-radius: 14px;
    background: var(--panel);
    display: flex;
    flex-direction: column;
    gap: 10px;
    div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.88rem;
    }
    dt {
      color: var(--muted);
    }
    dd {
      font-weight: 600;
      text-align: right;
    }
  }
`;

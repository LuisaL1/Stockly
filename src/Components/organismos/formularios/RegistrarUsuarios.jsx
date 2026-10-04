import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { LuIdCard, LuKeyRound, LuMapPin, LuPhone } from "react-icons/lu";
import { Modal } from "../../moleculas/Modal";
import { SpinnerLoader } from "../../moleculas/SpinnerLoader";
import { InputText } from "./InputText";
import { Formulario } from "./Formulario";
import { Boton } from "../../atomos/Boton";
import { Selector } from "../Selector";
import { ListaModulos } from "../ListaModulos";
import { useUsuariosStore } from "../../../store/UsuariosStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { TipouserData } from "../../../utils/dataEstatica";
import { v } from "../../../styles/variables";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegistrarUsuarios({ onClose, dataSelect = {}, accion }) {
  const editando = accion === "Editar";
  const { Insertar, Editar, MostrarModulos, MostrarPermisosEdit } = useUsuariosStore();
  const { dataempresa } = useEmpresaStore();
  const [tipouser, setTipouser] = useState(
    TipouserData.find((t) => t.descripcion === dataSelect.tipouser) ?? TipouserData[0]
  );
  const [checkboxs, setcheckboxs] = useState([]);

  const modulos = useQuery({ queryKey: ["modulos"], queryFn: MostrarModulos, staleTime: Infinity });
  const permisos = useQuery({
    queryKey: ["permisos edit", dataSelect.id],
    queryFn: () => MostrarPermisosEdit({ id_usuario: dataSelect.id }),
    enabled: editando && !!dataSelect.id,
    gcTime: 0,
  });

  // Marca los módulos que el usuario ya tiene asignados.
  useEffect(() => {
    if (!modulos.data) return;
    const asignados = new Set((permisos.data ?? []).map((p) => p.idmodulo));
    setcheckboxs(modulos.data.map((m) => ({ ...m, check: asignados.has(m.id) })));
  }, [modulos.data, permisos.data]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: dataSelect.email ?? "",
      nombres: dataSelect.nombres ?? "",
      nro_docum: dataSelect.nro_docum ?? "",
      telefono: dataSelect.telefono ?? "",
      direccion: dataSelect.direccion ?? "",
    },
  });

  async function guardar(data) {
    const datos = {
      nombres: data.nombres.trim(),
      nro_docum: data.nro_docum,
      telefono: data.telefono,
      direccion: data.direccion,
      tipouser: tipouser.descripcion,
    };
    const ok = editando
      ? await Editar({ id: dataSelect.id, ...datos }, checkboxs)
      : await Insertar(
          { email: data.email.trim().toLowerCase(), pass: data.pass },
          { ...datos, email: data.email.trim().toLowerCase(), id_empresa: dataempresa.id },
          checkboxs
        );
    if (ok) onClose();
  }

  const cargando = modulos.isLoading || permisos.isLoading;
  const requerido = (mensaje) => ({ validate: (t) => !!String(t ?? "").trim() || mensaje });

  return (
    <Modal
      titulo={editando ? "Editar usuario" : "Nuevo usuario"}
      subtitulo={editando ? dataSelect.email : "Se creará una cuenta de acceso para esta persona."}
      onClose={onClose}
      ancho="820px"
    >
      {cargando ? (
        <SpinnerLoader texto="Cargando permisos..." />
      ) : (
        <Formulario onSubmit={handleSubmit(guardar)}>
          <div className="grid">
            <div className="columna">
              <span className="titulo-seccion">Acceso</span>
              <div>
                <InputText label="Correo electrónico" icono={<v.iconoemail />} error={errors.email?.message}>
                  <input
                    type="email"
                    readOnly={editando}
                    placeholder="persona@empresa.com"
                    {...register("email", {
                      required: "Escribe el correo",
                      pattern: { value: EMAIL, message: "El correo no es válido" },
                    })}
                  />
                </InputText>
              </div>
              {!editando && (
                <div>
                  <InputText
                    label="Contraseña"
                    icono={<v.iconopass />}
                    error={errors.pass?.message}
                    ayuda="Mínimo 8 caracteres. Compártela de forma segura con la persona."
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      {...register("pass", {
                        required: "Escribe una contraseña",
                        minLength: { value: 8, message: "Debe tener al menos 8 caracteres" },
                      })}
                    />
                  </InputText>
                </div>
              )}

              <span className="titulo-seccion">Datos personales</span>
              <div>
                <InputText label="Nombres" icono={<v.icononombre />} error={errors.nombres?.message}>
                  <input {...register("nombres", requerido("Escribe el nombre"))} />
                </InputText>
              </div>
              <InputText label="Nro. de documento" icono={<LuIdCard />} error={errors.nro_docum?.message}>
                <input {...register("nro_docum", requerido("Escribe el documento"))} />
              </InputText>
              <InputText label="Teléfono" icono={<LuPhone />} error={errors.telefono?.message}>
                <input type="tel" {...register("telefono", requerido("Escribe el teléfono"))} />
              </InputText>
              <div>
                <InputText label="Dirección" icono={<LuMapPin />} error={errors.direccion?.message}>
                  <input {...register("direccion", requerido("Escribe la dirección"))} />
                </InputText>
              </div>
            </div>

            <div className="columna">
              <span className="titulo-seccion">Rol</span>
              <Selector
                opciones={TipouserData}
                valor={tipouser}
                onChange={setTipouser}
                renderOpcion={(o) => (
                  <>
                    <span>{o.icono}</span>
                    <span style={{ textTransform: "capitalize" }}>{o.descripcion}</span>
                  </>
                )}
              />
              <span className="titulo-seccion" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <LuKeyRound /> Permisos por módulo
              </span>
              <ListaModulos checkboxs={checkboxs} setcheckboxs={setcheckboxs} />
            </div>
          </div>

          <div className="acciones">
            <Boton variante="secundario" funcion={onClose}>
              Cancelar
            </Boton>
            <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting}>
              {editando ? "Guardar cambios" : "Crear usuario"}
            </Boton>
          </div>
        </Formulario>
      )}
    </Modal>
  );
}

import { useState } from "react";
import { useUnidades } from "../../../hooks/useUnidades";
import { UNIDADES, admitePresentacion, permiteDecimales } from "../../../utils/unidades";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../../moleculas/Modal";
import { InputText } from "./InputText";
import { Formulario } from "./Formulario";
import { Boton } from "../../atomos/Boton";
import { AccionTabla } from "../../atomos/AccionTabla";
import { Selector } from "../Selector";
import { RegistrarMarca } from "./RegistrarMarca";
import { RegistrarCategorias } from "./RegistrarCategorias";
import { ColorContent } from "../../atomos/ColorContent";
import { useProductosStore } from "../../../store/ProductosStore";
import { useMarcaStore } from "../../../store/MarcaStore";
import { useCategoriasStore } from "../../../store/CategoriasStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { CovertirCapitalize } from "../../../utils/conversiones";
import { v } from "../../../styles/variables";

const numero = (mensaje) => ({
  required: mensaje,
  valueAsNumber: true,
  min: { value: 0, message: "No puede ser negativo" },
});

// El código de barras es opcional: no todos los negocios lo usan. Se guarda como texto para
// conservar ceros a la izquierda y códigos largos (EAN-13, EAN-14).
const codigoBarras = (t) => String(t ?? "").trim() || null;

export function RegistrarProductos({ onClose, dataSelect = {}, accion }) {
  const editando = accion === "Editar";
  const { Insertar, Editar } = useProductosStore();
  const { dataempresa } = useEmpresaStore();
  const marcas = useMarcaStore();
  const categorias = useCategoriasStore();
  const idEmpresa = dataempresa?.id;

  useQuery({ queryKey: ["opciones marcas", idEmpresa], queryFn: () => marcas.Cargar(idEmpresa), enabled: !!idEmpresa });
  useQuery({
    queryKey: ["opciones categorias", idEmpresa],
    queryFn: () => categorias.Cargar(idEmpresa),
    enabled: !!idEmpresa,
  });

  const [marca, setMarca] = useState(
    editando ? { id: dataSelect.idmarca, descripcion: dataSelect.marca } : null
  );
  const [categoria, setCategoria] = useState(
    editando ? { id: dataSelect.id_categoria, descripcion: dataSelect.categoria } : null
  );
  const [subRegistro, setSubRegistro] = useState(null); // "marca" | "categoria"
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const marcaActual = marca ?? marcas.data?.[0] ?? null;
  const categoriaActual = categoria ?? categorias.data?.[0] ?? null;
  const unidades = useUnidades();
  const [unidad, setUnidad] = useState(null);
  const unidadActual = unidad ?? unidades.activas.find((u) => u.id === (editando ? dataSelect.unidad : unidades.predeterminada)) ?? unidades.activas[0] ?? null;
  const conDecimales = permiteDecimales(unidadActual?.id);
  const SIN_PRESENTACION = { id: null, descripcion: "Sin presentación (se cuenta suelto)" };
  const opcionesPresentacion = [SIN_PRESENTACION, ...unidades.presentaciones];
  const [presentacion, setPresentacion] = useState(undefined);
  const presentacionActual = presentacion !== undefined ? presentacion : opcionesPresentacion.find((p) => p.id === (dataSelect.presentacion ?? null)) ?? SIN_PRESENTACION;
  const unidadesContenido = UNIDADES.map((u) => ({ ...u, descripcion: `${u.plural} (${u.abrev})` }));
  const [contenidoUnidad, setContenidoUnidad] = useState(null);
  const contenidoUnidadActual = contenidoUnidad ?? unidadesContenido.find((u) => u.id === (dataSelect.contenido_unidad ?? "ml")) ?? unidadesContenido[0];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: editando
      ? {
          descripcion: dataSelect.descripcion,
          stock: dataSelect.stock,
          stockminimo: dataSelect.stock_minimo,
          codigobarras: dataSelect.codigobarras ?? "",
          codigointerno: dataSelect.codigointerno,
          precioventa: dataSelect.precioventa,
          preciocompra: dataSelect.preciocompra,
          contenido: dataSelect.contenido ?? "",
        }
      : {},
  });

  async function guardar(data) {
    if (!marcaActual || !categoriaActual) return;
    const ok = editando
      ? await Editar({
          id: dataSelect.id,
          descripcion: CovertirCapitalize(data.descripcion),
          idmarca: marcaActual.id,
          stock_minimo: data.stockminimo,
          codigobarras: codigoBarras(data.codigobarras),
          codigointerno: data.codigointerno,
          precioventa: data.precioventa,
          preciocompra: data.preciocompra,
          id_categoria: categoriaActual.id,
          id_empresa: idEmpresa,
          unidad: unidadActual?.id ?? "und",
          presentacion: admitePresentacion(unidadActual?.id) ? presentacionActual?.id ?? null : null,
          contenido: admitePresentacion(unidadActual?.id) && presentacionActual?.id && data.contenido ? Number(data.contenido) : null,
          contenido_unidad: admitePresentacion(unidadActual?.id) && presentacionActual?.id && data.contenido ? contenidoUnidadActual.id : null,
        })
      : await Insertar({
          _descripcion: CovertirCapitalize(data.descripcion),
          _idmarca: marcaActual.id,
          _stock: data.stock,
          _stock_minimo: data.stockminimo,
          _codigobarras: codigoBarras(data.codigobarras),
          _codigointerno: data.codigointerno,
          _precioventa: data.precioventa,
          _preciocompra: data.preciocompra,
          _id_categoria: categoriaActual.id,
          _id_empresa: idEmpresa,
          _unidad: unidadActual?.id ?? "und",
          _presentacion: admitePresentacion(unidadActual?.id) ? presentacionActual?.id ?? null : null,
          _contenido: admitePresentacion(unidadActual?.id) && presentacionActual?.id && data.contenido ? Number(data.contenido) : null,
          _contenido_unidad: admitePresentacion(unidadActual?.id) && presentacionActual?.id && data.contenido ? contenidoUnidadActual.id : null,
        });
    if (ok) onClose();
  }

  return (
    <Modal
      titulo={editando ? "Editar producto" : "Nuevo producto"}
      subtitulo={editando ? dataSelect.descripcion : "Completa la información básica del producto."}
      onClose={onClose}
      ancho="760px"
    >
      <Formulario onSubmit={(e) => { setIntentoGuardar(true); return handleSubmit(guardar)(e); }}>
        <div className="grid">
          <div className="completo">
            <InputText label="Descripción" icono={<v.icononombre />} error={errors.descripcion?.message}>
              <input
                autoFocus
                placeholder="Ej. Crema dental 75 ml"
                {...register("descripcion", { validate: (t) => !!t?.trim() || "Escribe la descripción" })}
              />
            </InputText>
          </div>

          <div>
            <span className="etiqueta">Marca</span>
            <div style={{ marginTop: 6 }}>
              <Selector
                opciones={marcas.data}
                valor={marcaActual}
                onChange={setMarca}
                buscable
                icono={<v.iconomarca />}
                placeholder="Selecciona una marca"
                error={intentoGuardar && !marcaActual ? "Selecciona una marca" : undefined}
                accionExtra={
                  <AccionTabla etiqueta="Nueva marca" icono={<v.agregar />} funcion={() => setSubRegistro("marca")} />
                }
              />
            </div>
          </div>

          <div>
            <span className="etiqueta">Categoría</span>
            <div style={{ marginTop: 6 }}>
              <Selector
                opciones={categorias.data}
                valor={categoriaActual}
                onChange={setCategoria}
                buscable
                icono={<v.iconocategorias />}
                placeholder="Selecciona una categoría"
                error={intentoGuardar && !categoriaActual ? "Selecciona una categoría" : undefined}
                renderOpcion={(o) => (
                  <>
                    <ColorContent $color={o.color} $alto="12px" $ancho="12px" />
                    {o.descripcion}
                  </>
                )}
                accionExtra={
                  <AccionTabla
                    etiqueta="Nueva categoría"
                    icono={<v.agregar />}
                    funcion={() => setSubRegistro("categoria")}
                  />
                }
              />
            </div>
          </div>

          <span className="titulo-seccion completo">Inventario</span>
          <div>
            <span className="etiqueta">¿Cómo lo cuentas?</span>
            <div style={{ marginTop: 6 }}>
              <Selector opciones={unidades.activas} valor={unidadActual} onChange={setUnidad} icono={<v.iconostock />} placeholder="Unidad de medida" />
            </div>
            <small style={{ display: "block", marginTop: 4, opacity: 0.7 }}>
              {conDecimales ? "A granel: el stock admite decimales (250 g, 1,5 l)." : "Por piezas enteras."} Las unidades se configuran en Tu empresa.
            </small>
          </div>
          {admitePresentacion(unidadActual?.id) && (
            <div>
              <span className="etiqueta">Presentación</span>
              <div style={{ marginTop: 6 }}>
                <Selector opciones={opcionesPresentacion} valor={presentacionActual} onChange={setPresentacion} icono={<v.iconotodos />} />
              </div>
              {presentacionActual?.id && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <InputText label="Contenido" icono={<v.iconocalculadora />} error={errors.contenido?.message}>
                    <input type="number" step="any" min="0" placeholder="Ej. 100" {...register("contenido", { min: { value: 0, message: "No puede ser negativo" } })} />
                  </InputText>
                  <div>
                    <span className="etiqueta">Medida del contenido</span>
                    <div style={{ marginTop: 6 }}>
                      <Selector opciones={unidadesContenido} valor={contenidoUnidadActual} onChange={setContenidoUnidad} />
                    </div>
                  </div>
                </div>
              )}
              <small style={{ display: "block", marginTop: 4, opacity: 0.7 }}>
                Cómo viene el producto: un frasco de 100 ml, una caja de 12 und. El stock se cuenta en {presentacionActual?.id ? presentacionActual.plural?.toLowerCase() ?? "piezas" : "piezas"}.
              </small>
            </div>
          )}
          <InputText
            label="Stock inicial"
            icono={<v.iconostock />}
            error={errors.stock?.message}
            ayuda={editando ? "Para cambiar el stock registra un ajuste de inventario en Kardex: así queda el historial." : undefined}
          >
            <input type="number" step={conDecimales ? "any" : "1"} readOnly={editando} {...register("stock", numero("Indica el stock"))} />
          </InputText>
          <InputText label="Stock mínimo" icono={<v.iconostockminimo />} error={errors.stockminimo?.message} ayuda="Te avisaremos cuando el stock llegue a este nivel.">
            <input type="number" step="any" {...register("stockminimo", numero("Indica el stock mínimo"))} />
          </InputText>

          <span className="titulo-seccion completo">Precios</span>
          <InputText label="Precio de compra" icono={<v.iconopreciocompra />} error={errors.preciocompra?.message}>
            <input type="number" step="0.01" {...register("preciocompra", numero("Indica el precio de compra"))} />
          </InputText>
          <InputText label="Precio de venta" icono={<v.iconoprecioventa />} error={errors.precioventa?.message}>
            <input type="number" step="0.01" {...register("precioventa", numero("Indica el precio de venta"))} />
          </InputText>

          <span className="titulo-seccion completo">Códigos</span>
          <InputText label="Código de barras (opcional)" icono={<v.iconocodigobarras />} error={errors.codigobarras?.message}>
            <input inputMode="numeric" autoComplete="off" placeholder="Escanéalo o déjalo vacío" {...register("codigobarras", { pattern: { value: /^[0-9A-Za-z-]*$/, message: "Solo números, letras o guiones" } })} />
          </InputText>
          <InputText label="Código interno" icono={<v.iconocodigointerno />} error={errors.codigointerno?.message}>
            <input {...register("codigointerno", { validate: (t) => !!String(t ?? "").trim() || "Indica el código interno" })} />
          </InputText>
        </div>

        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting}>
            Guardar producto
          </Boton>
        </div>
      </Formulario>

      {subRegistro === "marca" && <RegistrarMarca accion="Nuevo" onClose={() => setSubRegistro(null)} />}
      {subRegistro === "categoria" && <RegistrarCategorias accion="Nuevo" onClose={() => setSubRegistro(null)} />}
    </Modal>
  );
}

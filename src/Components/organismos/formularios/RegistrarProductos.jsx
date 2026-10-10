import { useState } from "react";
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
          <InputText
            label="Stock inicial"
            icono={<v.iconostock />}
            error={errors.stock?.message}
            ayuda={editando ? "Para ajustar el stock registra una entrada o salida en Kardex." : undefined}
          >
            <input type="number" step="any" readOnly={editando} {...register("stock", numero("Indica el stock"))} />
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

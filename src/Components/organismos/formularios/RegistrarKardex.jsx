import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../moleculas/Modal";
import { CardProductoSelect } from "../../moleculas/CardProductoSelect";
import { InputText } from "./InputText";
import { Formulario } from "./Formulario";
import { Boton } from "../../atomos/Boton";
import { Selector } from "../Selector";
import { useKardexStore } from "../../../store/KardexStore";
import { useProductosStore } from "../../../store/ProductosStore";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useUsuariosStore } from "../../../store/UsuariosStore";
import { BuscarProductos } from "../../../supabase/crudProductos";
import { MostrarBodegas, MostrarStockBodega } from "../../../supabase/crudBodegas";
import { formatearNumero } from "../../../utils/conversiones";
import { v } from "../../../styles/variables";

export function RegistrarKardex({ onClose, tipo }) {
  const esSalida = tipo === "Salida";
  const { Insertar } = useKardexStore();
  const { dataempresa } = useEmpresaStore();
  const { idusuario } = useUsuariosStore();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [producto, setProducto] = useState(null);
  const [bodega, setBodega] = useState(null);
  const [intentoGuardar, setIntentoGuardar] = useState(false);

  const { data: productos } = useQuery({
    queryKey: ["buscar productos kardex", dataempresa?.id, texto],
    queryFn: () => BuscarProductos({ _id_empresa: dataempresa.id, buscador: texto }),
    enabled: !!dataempresa?.id,
    placeholderData: (previo) => previo,
  });

  const bodegas = useQuery({
    queryKey: ["bodegas", dataempresa?.id],
    queryFn: () => MostrarBodegas(dataempresa.id),
    enabled: !!dataempresa?.id,
  });
  const opcionesBodega = (bodegas.data ?? []).map((b) => ({ ...b, descripcion: b.nombre }));
  const bodegaActual = bodega ?? opcionesBodega[0] ?? null;
  const stockBodega = useQuery({
    queryKey: ["stock bodega", dataempresa?.id, bodegaActual?.id, producto?.id],
    queryFn: () => MostrarStockBodega({ idEmpresa: dataempresa.id, idBodega: bodegaActual.id, idProducto: producto.id }),
    enabled: !!bodegaActual && !!producto,
  });
  // Con varias bodegas, la salida se valida contra lo que hay en la bodega elegida.
  const disponible =
    producto && stockBodega.data?.[0] ? Number(stockBodega.data[0].cantidad) : Number(producto?.stock ?? 0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const cantidad = Number(watch("cantidad") || 0);
  const stockResultante = producto ? disponible + (esSalida ? -cantidad : cantidad) : null;

  async function guardar(data) {
    if (!producto) return;
    const ok = await Insertar({
      fecha: new Date(),
      tipo,
      id_usuario: idusuario,
      cantidad: data.cantidad,
      detalle: data.detalle.trim(),
      id_empresa: dataempresa.id,
      id_producto: producto.id,
      id_bodega: bodegaActual?.id ?? null,
    });
    if (ok) {
      // El stock de los productos cambia: refrescamos listas y KPIs.
      useProductosStore.getState().recargar();
      queryClient.invalidateQueries();
      onClose();
    }
  }

  return (
    <Modal
      titulo={esSalida ? "Registrar salida" : "Registrar entrada"}
      subtitulo={esSalida ? "Descuenta unidades del inventario." : "Suma unidades al inventario."}
      onClose={onClose}
      ancho="520px"
    >
      <Formulario
        onSubmit={(e) => {
          setIntentoGuardar(true);
          return handleSubmit(guardar)(e);
        }}
      >
        <div>
          <span className="etiqueta">Producto</span>
          <div style={{ marginTop: 6 }}>
            <Selector
              opciones={productos}
              valor={producto}
              onChange={setProducto}
              buscable
              onBuscar={setTexto}
              icono={<v.iconostock />}
              placeholder="Busca y selecciona un producto"
              error={intentoGuardar && !producto ? "Selecciona un producto" : undefined}
              renderOpcion={(o) => (
                <span style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8 }}>
                  <span>{o.descripcion}</span>
                  <small style={{ opacity: 0.7 }}>Stock: {formatearNumero(o.stock)}</small>
                </span>
              )}
            />
          </div>
        </div>

        {opcionesBodega.length > 1 && (
          <div>
            <span className="etiqueta">Bodega</span>
            <div style={{ marginTop: 6 }}>
              <Selector opciones={opcionesBodega} valor={bodegaActual} onChange={setBodega} icono={<v.iconobodegas />} />
            </div>
          </div>
        )}

        {producto && (
          <CardProductoSelect
            text1={producto.descripcion}
            text2={formatearNumero(disponible)}
            alerta={Number(producto.stock) <= Number(producto.stock_minimo ?? 0)}
          />
        )}

        <InputText
          label="Cantidad"
          icono={<v.iconocalculadora />}
          error={errors.cantidad?.message}
          ayuda={
            producto && cantidad > 0 && !errors.cantidad
              ? `Stock en ${bodegaActual?.nombre ?? "la bodega"} después del movimiento: ${formatearNumero(stockResultante)}`
              : undefined
          }
        >
          <input
            type="number"
            step="any"
            placeholder="0"
            {...register("cantidad", {
              required: "Indica la cantidad",
              valueAsNumber: true,
              validate: (n) => {
                if (!(n > 0)) return "La cantidad debe ser mayor que cero";
                if (esSalida && producto && n > disponible) {
                  return `No hay stock suficiente en esta bodega (disponible: ${formatearNumero(disponible)})`;
                }
                return true;
              },
            })}
          />
        </InputText>

        <InputText label="Detalle" icono={<v.iconotodos />} error={errors.detalle?.message}>
          <input
            placeholder={esSalida ? "Ej. Venta mostrador" : "Ej. Compra a proveedor"}
            {...register("detalle", { validate: (t) => !!t?.trim() || "Describe el motivo del movimiento" })}
          />
        </InputText>

        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" icono={<v.iconoguardar />} cargando={isSubmitting}>
            Registrar {esSalida ? "salida" : "entrada"}
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

import { useState } from "react";
import styled from "styled-components";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../../moleculas/Modal";
import { CardProductoSelect } from "../../moleculas/CardProductoSelect";
import { InputText } from "./InputText";
import { Formulario } from "./Formulario";
import { Boton } from "../../atomos/Boton";
import { Selector } from "../Selector";
import { SelectorProducto } from "../reportes/SelectorProducto";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { useProductosStore } from "../../../store/ProductosStore";
import { RegistrarAjuste as Registrar } from "../../../supabase/crudKardex";
import { MostrarBodegas, MostrarStockBodega } from "../../../supabase/crudBodegas";
import { MOTIVOS_AJUSTE } from "../../../utils/kardex";
import { formatearNumero } from "../../../utils/conversiones";
import { v } from "../../../styles/variables";

// Ajuste manual de inventario: entrada o salida con motivo. Queda en el kardex y se puede anular.
export function RegistrarAjuste({ onClose, onGuardado, productoInicial = null }) {
  const { dataempresa } = useEmpresaStore();
  const [tipo, setTipo] = useState("Entrada");
  const [producto, setProducto] = useState(productoInicial);
  const [bodega, setBodega] = useState(null);
  const [motivo, setMotivo] = useState(null);
  const [intento, setIntento] = useState(false);
  const esSalida = tipo === "Salida";

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
  const disponible = producto && stockBodega.data?.[0] ? Number(stockBodega.data[0].cantidad) : Number(producto?.stock ?? 0);
  const motivos = MOTIVOS_AJUSTE.filter((m) => m.tipos.includes(tipo));
  const motivoActual = motivo && motivos.includes(motivo) ? motivo : null;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();
  const cantidad = Number(watch("cantidad") || 0);
  const resultante = producto ? disponible + (esSalida ? -cantidad : cantidad) : null;

  async function guardar(data) {
    if (!producto || !motivoActual) return;
    const ok = await Registrar({
      idEmpresa: dataempresa.id,
      idProducto: producto.id,
      idBodega: bodegaActual?.id ?? null,
      tipo,
      cantidad: data.cantidad,
      motivo: motivoActual.id,
      nota: data.nota?.trim() || null,
    });
    if (ok) {
      useProductosStore.getState().recargar();
      onGuardado?.();
    }
  }

  return (
    <Modal titulo="Ajuste de inventario" subtitulo="Para lo que no pasa por una venta, una compra o un traslado." onClose={onClose} ancho="520px">
      <Formulario
        onSubmit={(e) => {
          setIntento(true);
          return handleSubmit(guardar)(e);
        }}
      >
        <Tipo role="radiogroup" aria-label="Tipo de ajuste">
          <button type="button" role="radio" aria-checked={!esSalida} className={esSalida ? "" : "activo entrada"} onClick={() => setTipo("Entrada")}>
            <v.flechaarribalarga /> Entrada
            <small>Suma unidades</small>
          </button>
          <button type="button" role="radio" aria-checked={esSalida} className={esSalida ? "activo salida" : ""} onClick={() => setTipo("Salida")}>
            <v.flechaabajolarga /> Salida
            <small>Descuenta unidades</small>
          </button>
        </Tipo>

        <div>
          <span className="etiqueta">Producto</span>
          <div style={{ marginTop: 6 }}>
            <SelectorProducto valor={producto} onChange={setProducto} />
          </div>
          {intento && !producto && <Error>Selecciona un producto</Error>}
        </div>

        {opcionesBodega.length > 1 && (
          <div>
            <span className="etiqueta">Bodega</span>
            <div style={{ marginTop: 6 }}>
              <Selector opciones={opcionesBodega} valor={bodegaActual} onChange={setBodega} icono={<v.iconobodegas />} />
            </div>
          </div>
        )}

        {producto && <CardProductoSelect text1={producto.descripcion} text2={formatearNumero(disponible)} alerta={Number(producto.stock) <= Number(producto.stock_minimo ?? 0)} />}

        <div>
          <span className="etiqueta">Motivo</span>
          <div style={{ marginTop: 6 }}>
            <Selector opciones={motivos} valor={motivoActual} onChange={setMotivo} icono={<v.iconotodos />} placeholder="¿Por qué se ajusta?" error={intento && !motivoActual ? "Elige el motivo" : undefined} />
          </div>
        </div>

        <InputText
          label="Cantidad"
          icono={<v.iconocalculadora />}
          error={errors.cantidad?.message}
          ayuda={producto && cantidad > 0 && !errors.cantidad ? `Quedarán ${formatearNumero(resultante)} en ${bodegaActual?.nombre ?? "la bodega"}.` : undefined}
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
                if (esSalida && producto && n > disponible) return `No hay stock suficiente en esta bodega (disponible: ${formatearNumero(disponible)})`;
                return true;
              },
            })}
          />
        </InputText>

        <InputText label="Nota (opcional)" icono={<v.iconotodos />} error={errors.nota?.message}>
          <input placeholder={esSalida ? "Ej. Caja golpeada en bodega" : "Ej. Conteo del cierre de mes"} maxLength={200} {...register("nota")} />
        </InputText>

        <div className="acciones">
          <Boton variante="secundario" funcion={onClose}>
            Cancelar
          </Boton>
          <Boton type="submit" variante={esSalida ? "peligro" : "exito"} icono={<v.iconoguardar />} cargando={isSubmitting}>
            Registrar {esSalida ? "salida" : "entrada"}
          </Boton>
        </div>
      </Formulario>
    </Modal>
  );
}

const Tipo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  button {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1.5px solid ${({ theme }) => theme.border};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    svg {
      margin-right: 6px;
      vertical-align: -2px;
    }
    small {
      font-weight: 400;
      color: ${({ theme }) => theme.textMuted};
    }
  }
  .activo.entrada {
    border-color: ${({ theme }) => theme.success};
    background: ${({ theme }) => theme.successSoft};
  }
  .activo.salida {
    border-color: ${({ theme }) => theme.danger};
    background: ${({ theme }) => theme.dangerSoft};
  }
`;
const Error = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.danger};
`;

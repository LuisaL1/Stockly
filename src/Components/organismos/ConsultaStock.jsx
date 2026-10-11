import { useMemo, useState } from "react";
import styled from "styled-components";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../moleculas/Modal";
import { EstadoVacio } from "../moleculas/EstadoVacio";
import { SpinnerLoader } from "../moleculas/SpinnerLoader";
import { Buscador } from "./Buscador";
import { useEmpresaStore } from "../../store/EmpresaStore";
import { StockEmpresa } from "../../supabase/crudBodegas";
import { cantidadConUnidad } from "../../utils/unidades";
import { v } from "../../styles/variables";

// Consulta de stock en toda la empresa: cada bodega y cada sede, aunque el usuario esté acotado a una sede.
// Solo lectura: para mover mercancía se usa Trasladar stock o un pedido.
export function ConsultaStock({ onClose }) {
  const { dataempresa } = useEmpresaStore();
  const [texto, setTexto] = useState("");
  const consulta = useQuery({
    queryKey: ["stock empresa", dataempresa?.id, texto],
    queryFn: () => StockEmpresa(dataempresa.id, texto),
    enabled: !!dataempresa?.id && texto.trim().length >= 2,
    placeholderData: (previo) => previo,
  });

  // Agrupado por producto, con sus bodegas y el total.
  const grupos = useMemo(() => {
    const porProducto = new Map();
    for (const f of consulta.data ?? []) {
      const g = porProducto.get(f.id_producto) ?? { producto: f.producto, unidad: f.unidad, presentacion: f.presentacion, total: 0, bodegas: [] };
      g.total += Number(f.cantidad);
      g.bodegas.push(f);
      porProducto.set(f.id_producto, g);
    }
    return [...porProducto.values()];
  }, [consulta.data]);

  return (
    <Modal titulo="Stock en toda la empresa" subtitulo="Busca un producto y mira cuánto hay en cada bodega y sede." onClose={onClose} ancho="640px">
      <Buscador setBuscador={setTexto} placeholder="Nombre, código o código de barras…" retraso={250} />
      <Cuerpo>
        {texto.trim().length < 2 ? (
          <EstadoVacio titulo="Escribe al menos 2 letras" mensaje="Verás el stock de ese producto en todas las bodegas." icono={<v.iconobodegas />} />
        ) : consulta.isLoading ? (
          <SpinnerLoader />
        ) : !grupos.length ? (
          <EstadoVacio titulo="Sin resultados" mensaje="Ningún producto coincide." />
        ) : (
          grupos.map((g) => (
            <Grupo key={g.producto}>
              <header>
                <strong>{g.producto}</strong>
                <b>{cantidadConUnidad(g.total, g)} en total</b>
              </header>
              <ul>
                {g.bodegas.map((b) => (
                  <li key={b.id_bodega} className={Number(b.cantidad) <= 0 ? "vacia" : ""}>
                    <span>
                      {b.bodega}
                      {b.sucursal && <small> · {b.sucursal}</small>}
                      {b.mia && <em>tu sede</em>}
                    </span>
                    <b>{cantidadConUnidad(b.cantidad, g)}</b>
                  </li>
                ))}
              </ul>
            </Grupo>
          ))
        )}
      </Cuerpo>
    </Modal>
  );
}

const Cuerpo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
  max-height: 60vh;
  overflow: auto;
`;
const Grupo = styled.section`
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radiusSm};
  overflow: hidden;
  header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    background: ${({ theme }) => theme.surfaceAlt};
    b {
      white-space: nowrap;
    }
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    border-top: 1px solid ${({ theme }) => theme.border};
    font-size: 0.92rem;
    small {
      color: ${({ theme }) => theme.textMuted};
    }
    em {
      margin-left: 8px;
      font-style: normal;
      font-size: 0.72rem;
      font-weight: 700;
      color: ${({ theme }) => theme.primary};
      background: ${({ theme }) => theme.primarySoft};
      padding: 1px 7px;
      border-radius: 999px;
    }
    b {
      font-variant-numeric: tabular-nums;
    }
    &.vacia {
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;

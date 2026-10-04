import { useState } from "react";
import styled from "styled-components";
import Swal from "sweetalert2";
import { useQueryClient } from "@tanstack/react-query";
import { Boton } from "../atomos/Boton";
import { CargarDatosDemo } from "../../supabase/crudDemo";
import { v } from "../../styles/variables";

// Invita a llenar la empresa con datos de ejemplo para explorar la app.
export function BannerDemo({ compacto = false }) {
  const queryClient = useQueryClient();
  const [cargando, setCargando] = useState(false);

  async function cargar() {
    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "¿Cargar datos de ejemplo?",
      html:
        "Crearemos productos, bodegas, clientes, proveedores, un mes de ventas y órdenes de compra para que explores Stockly.<br/><br/>" +
        "Tu empresa pasará al plan <b>Pro</b> (sin cobro) para mostrar varias bodegas.",
      showCancelButton: true,
      confirmButtonText: "Sí, cargar datos",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#8800B3",
      reverseButtons: true,
    });
    if (!isConfirmed) return;
    setCargando(true);
    const ok = await CargarDatosDemo();
    setCargando(false);
    if (ok) queryClient.invalidateQueries();
  }

  return (
    <Container $compacto={compacto}>
      <span className="icono">
        <v.iconorayo />
      </span>
      <div className="texto">
        <strong>¿Quieres ver Stockly en acción?</strong>
        <span>Carga un negocio de ejemplo con productos, bodegas y un mes de ventas para explorar todo.</span>
      </div>
      <Boton icono={<v.icononovandra />} cargando={cargando} funcion={cargar}>
        Cargar datos de ejemplo
      </Boton>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 20px;
  border-radius: ${({ theme }) => theme.radiusXl};
  border: 1.5px dashed ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primarySoft};
  .icono {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 14px;
    background: ${({ theme }) => theme.primary};
    color: ${({ theme }) => theme.onPrimary};
    font-size: 20px;
  }
  .texto {
    flex: 1 1 260px;
    display: flex;
    flex-direction: column;
    span {
      font-size: 0.88rem;
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;

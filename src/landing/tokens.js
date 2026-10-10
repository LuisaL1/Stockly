import { css } from "styled-components";

// Colores de la marca para la página pública.
export const MORADO = "#8800B3";
export const MORADO_CLARO = "#E2A4FF";
export const TINTA = "#17131D";
export const TINTA2 = "#241F2B";
export const PAPEL = "#F4EFE9"; // mismo fondo de la ilustración de marca
export const GRIS = "#6B6472";
export const LINEA = "#E7E2DA";
export const SUAVE = "#F2E7F8";
export const VERDE = "#25D366";


// Desactiva las animaciones si la persona lo prefiere.
export const sinMovimiento = css`
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`;


import styled from "styled-components";

// Etiqueta tipo "pill" que toma el color de la categoría o del tipo de movimiento.
export const ColorContentTabla = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${(props) => props.$color};
  background: color-mix(in srgb, ${(props) => props.$color} 14%, transparent);
  white-space: nowrap;
`;

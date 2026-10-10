import styled from "styled-components";

// Filtros de lista: selects compactos al lado del buscador y un botón para limpiarlos.
// opciones: [{ id, descripcion }] · valor: id actual · onChange(id)
export function SelectFiltro({ valor, onChange, opciones, etiqueta, todos = "Todos" }) {
  return (
    <Select value={valor ?? ""} onChange={(e) => onChange(e.target.value)} aria-label={etiqueta} title={etiqueta}>
      <option value="">{todos}</option>
      {opciones.map((o) => (
        <option key={o.id} value={o.id}>
          {o.descripcion}
        </option>
      ))}
    </Select>
  );
}

export function BotonLimpiar({ visible, onClick }) {
  if (!visible) return null;
  return (
    <Limpiar type="button" onClick={onClick}>
      Limpiar filtros
    </Limpiar>
  );
}

const Select = styled.select`
  height: 42px;
  padding: 0 32px 0 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radiusSm};
  background: ${({ theme }) => theme.surface};
  color: ${({ theme }) => theme.text};
  font: inherit;
  font-size: 0.92rem;
  max-width: 100%;
  cursor: pointer;
`;

const Limpiar = styled.button`
  height: 42px;
  padding: 0 12px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.primary};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
`;

import styled from "styled-components";

// Lista de módulos con casillas para asignar permisos.
export function ListaModulos({ checkboxs, setcheckboxs }) {
  const alternar = (id) =>
    setcheckboxs((prev) => prev.map((m) => (m.id === id ? { ...m, check: !m.check } : m)));

  const todos = checkboxs.length > 0 && checkboxs.every((m) => m.check);
  const alternarTodos = () => setcheckboxs((prev) => prev.map((m) => ({ ...m, check: !todos })));

  return (
    <Container>
      <label className="fila todos">
        <input type="checkbox" checked={todos} onChange={alternarTodos} />
        <span>Seleccionar todos</span>
      </label>
      {checkboxs.map((m) => (
        <label key={m.id} className="fila">
          <input type="checkbox" checked={!!m.check} onChange={() => alternar(m.id)} />
          <span>{m.nombre}</span>
        </label>
      ))}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius};
  overflow: hidden;
  .fila {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    cursor: pointer;
    user-select: none;
    & + .fila {
      border-top: 1px solid ${({ theme }) => theme.border};
    }
    &:hover {
      background: ${({ theme }) => theme.surfaceAlt};
    }
  }
  .todos {
    background: ${({ theme }) => theme.surfaceAlt};
    font-weight: 600;
  }
  input {
    width: 18px;
    height: 18px;
    accent-color: ${({ theme }) => theme.primary};
    cursor: pointer;
  }
`;

import { useEffect, useState } from "react";
import styled from "styled-components";
import { LuSearch } from "react-icons/lu";

// Buscador con "debounce" para no consultar Supabase en cada tecla.
export function Buscador({ setBuscador, placeholder = "Buscar...", retraso = 300 }) {
  const [texto, setTexto] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBuscador(texto), retraso);
    return () => clearTimeout(t);
  }, [texto, retraso, setBuscador]);

  useEffect(() => () => setBuscador(""), [setBuscador]);

  return (
    <Container>
      <LuSearch className="icono" />
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </Container>
  );
}

const Container = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  width: 100%;
  max-width: 360px;
  padding: 0 14px;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radiusSm};
  transition: border-color 0.15s, box-shadow 0.15s;
  &:focus-within {
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.primarySoft};
  }
  .icono {
    color: ${({ theme }) => theme.textMuted};
    flex-shrink: 0;
  }
  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    color: ${({ theme }) => theme.text};
    &::placeholder {
      color: ${({ theme }) => theme.textMuted};
    }
  }
`;

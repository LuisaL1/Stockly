import { useId, cloneElement, isValidElement } from "react";
import styled from "styled-components";

// Campo de formulario: etiqueta + control + mensaje de error/ayuda.
// El control (input, select, textarea) se pasa como hijo.
export function InputText({ label, icono, error, ayuda, children }) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children, { id: children.props.id ?? id, "aria-invalid": !!error })
    : children;

  return (
    <Container $error={!!error} $conIcono={!!icono}>
      {label && <label htmlFor={children?.props?.id ?? id}>{label}</label>}
      <div className="control">
        {icono && <span className="icono">{icono}</span>}
        {control}
      </div>
      {error ? <span className="error">{error}</span> : ayuda && <span className="ayuda">{ayuda}</span>}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text};
  }
  .control {
    position: relative;
    display: flex;
    align-items: center;
  }
  .icono {
    position: absolute;
    left: 12px;
    display: flex;
    font-size: 18px;
    color: ${({ theme }) => theme.textMuted};
    pointer-events: none;
  }
  input,
  select,
  textarea {
    width: 100%;
    height: 42px;
    padding: 0 12px 0 ${({ $conIcono }) => ($conIcono ? "40px" : "12px")};
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    border: 1px solid ${({ theme, $error }) => ($error ? theme.danger : theme.border)};
    border-radius: ${({ theme }) => theme.radiusSm};
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    &::placeholder {
      color: ${({ theme }) => theme.textMuted};
      opacity: 0.7;
    }
    &:focus {
      border-color: ${({ theme, $error }) => ($error ? theme.danger : theme.primary)};
      box-shadow: 0 0 0 3px
        ${({ theme, $error }) => ($error ? theme.dangerSoft : theme.primarySoft)};
    }
    &:disabled,
    &[readonly] {
      background: ${({ theme }) => theme.surfaceAlt};
      color: ${({ theme }) => theme.textMuted};
      cursor: not-allowed;
    }
  }
  textarea {
    height: auto;
    min-height: 84px;
    padding-top: 10px;
    resize: vertical;
  }
  input:-webkit-autofill {
    -webkit-text-fill-color: ${({ theme }) => theme.text};
    -webkit-box-shadow: 0 0 0 40px ${({ theme }) => theme.surface} inset;
  }
  .error {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.danger};
  }
  .ayuda {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.textMuted};
  }
`;

import { forwardRef, useState } from "react";
import styled from "styled-components";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { InputText } from "../formularios/InputText";
import { v } from "../../../styles/variables";

const NIVELES = [
  { texto: "Muy débil", tono: "danger" },
  { texto: "Débil", tono: "danger" },
  { texto: "Aceptable", tono: "warning" },
  { texto: "Buena", tono: "success" },
  { texto: "Excelente", tono: "success" },
];

function fuerza(pass = "") {
  let puntos = 0;
  if (pass.length >= 8) puntos++;
  if (pass.length >= 12) puntos++;
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) puntos++;
  if (/\d/.test(pass)) puntos++;
  if (/[^A-Za-z0-9]/.test(pass)) puntos++;
  return Math.min(puntos, 4);
}

// Campo de contraseña con botón para mostrarla y, opcionalmente, medidor de seguridad.
// Se usa con react-hook-form: <CampoContrasena {...register("pass")} valor={watch("pass")} />
export const CampoContrasena = forwardRef(function CampoContrasena(
  { label = "Contraseña", error, ayuda, medidor = false, valor = "", ...input },
  ref
) {
  const [visible, setVisible] = useState(false);
  const nivel = NIVELES[fuerza(valor)];

  return (
    <Container>
      <InputText label={label} icono={<v.iconopass />} error={error} ayuda={ayuda}>
        <input ref={ref} type={visible ? "text" : "password"} placeholder="••••••••" {...input} />
      </InputText>
      <button
        type="button"
        className="ver"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        title={visible ? "Ocultar" : "Mostrar"}
      >
        {visible ? <LuEyeOff /> : <LuEye />}
      </button>
      {medidor && valor && (
        <Medidor $tono={nivel.tono} aria-live="polite">
          <div className="barras">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={i < fuerza(valor) ? "llena" : ""} />
            ))}
          </div>
          <small>{nivel.texto}</small>
        </Medidor>
      )}
    </Container>
  );
});

const Container = styled.div`
  position: relative;
  input {
    padding-right: 44px !important;
  }
  .ver {
    position: absolute;
    right: 6px;
    top: 30px;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${({ theme }) => theme.textMuted};
    font-size: 17px;
    cursor: pointer;
    &:hover {
      color: ${({ theme }) => theme.primary};
      background: ${({ theme }) => theme.primarySoft};
    }
  }
`;

const Medidor = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  .barras {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    span {
      height: 4px;
      border-radius: 999px;
      background: ${({ theme }) => theme.surfaceAlt};
      &.llena {
        background: ${({ theme, $tono }) => theme[$tono]};
      }
    }
  }
  small {
    min-width: 70px;
    text-align: right;
    font-size: 0.75rem;
    font-weight: 600;
    color: ${({ theme, $tono }) => theme[$tono]};
  }
`;

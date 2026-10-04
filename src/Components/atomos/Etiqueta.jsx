import styled from "styled-components";

// Etiqueta de estado. tono: "primary" | "success" | "warning" | "danger" | "info" | "neutro"
export function Etiqueta({ tono = "primary", icono, children, title }) {
  return (
    <Container $tono={tono} title={title}>
      {icono}
      {children}
    </Container>
  );
}

const Container = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme, $tono }) => ($tono === "neutro" ? theme.textMuted : theme[$tono])};
  background: ${({ theme, $tono }) => ($tono === "neutro" ? theme.surfaceAlt : theme[`${$tono}Soft`])};
  svg {
    font-size: 13px;
  }
`;

// Tonos y textos por estado de los registros.
const ESTADOS = {
  pagada: { tono: "success", texto: "Pagada" },
  pendiente: { tono: "warning", texto: "Pendiente" },
  anulada: { tono: "danger", texto: "Anulada" },
  borrador: { tono: "neutro", texto: "Borrador" },
  enviada: { tono: "info", texto: "Enviada" },
  recibida: { tono: "success", texto: "Recibida" },
  cancelada: { tono: "danger", texto: "Cancelada" },
  no_aplica: { tono: "neutro", texto: "Interna" },
  aceptada: { tono: "success", texto: "Aceptada DIAN" },
  rechazada: { tono: "danger", texto: "Rechazada DIAN" },
};

export function EtiquetaEstado({ estado, prefijo = "" }) {
  const e = ESTADOS[estado] ?? { tono: "neutro", texto: estado };
  return <Etiqueta tono={e.tono}>{prefijo + e.texto}</Etiqueta>;
}

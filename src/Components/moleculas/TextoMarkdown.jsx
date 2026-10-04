import { Fragment } from "react";
import styled from "styled-components";

// Formato en línea: **negrita**, *cursiva* / _cursiva_ y `código`.
function enLinea(texto) {
  return texto.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g).map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) return <strong key={i}>{parte.slice(2, -2)}</strong>;
    if (parte.startsWith("`") && parte.endsWith("`") && parte.length > 2) return <code key={i}>{parte.slice(1, -1)}</code>;
    if (/^([*_]).+\1$/.test(parte)) return <em key={i}>{parte.slice(1, -1)}</em>;
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

const celdas = (linea) =>
  linea
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

// Convierte el texto en bloques: títulos, párrafos, listas y tablas.
function bloques(contenido) {
  const lineas = contenido.split("\n");
  const salida = [];
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const ultimo = salida.at(-1);

    // Tabla: fila con "|" seguida (en algún punto) de un separador |---|
    if (/^\s*\|.*\|\s*$/.test(linea)) {
      if (/^\s*\|?[\s:-]+(\|[\s:-]+)+\|?\s*$/.test(linea)) continue; // separador
      if (ultimo?.tipo === "tabla") ultimo.filas.push(celdas(linea));
      else salida.push({ tipo: "tabla", encabezado: celdas(linea), filas: [] });
      continue;
    }
    const titulo = linea.match(/^\s*(#{1,4})\s+(.*)/);
    if (titulo) {
      salida.push({ tipo: "titulo", texto: titulo[2] });
      continue;
    }
    const vineta = linea.match(/^\s*[-*•]\s+(.*)/);
    const numero = linea.match(/^\s*\d+[.)]\s+(.*)/);
    if (vineta || numero) {
      const tipo = vineta ? "ul" : "ol";
      const texto = (vineta ?? numero)[1];
      if (ultimo?.tipo === tipo) ultimo.items.push(texto);
      else salida.push({ tipo, items: [texto] });
      continue;
    }
    if (linea.trim()) salida.push({ tipo: "p", texto: linea });
  }
  return salida;
}

export function TextoMarkdown({ contenido = "" }) {
  return (
    <Contenedor>
      {bloques(contenido).map((b, i) => {
        if (b.tipo === "titulo") return <h4 key={i}>{enLinea(b.texto)}</h4>;
        if (b.tipo === "p") return <p key={i}>{enLinea(b.texto)}</p>;
        if (b.tipo === "tabla")
          return (
            <div className="tabla" key={i}>
              <table>
                <thead>
                  <tr>
                    {b.encabezado.map((c, j) => (
                      <th key={j}>{enLinea(c)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.filas.map((fila, j) => (
                    <tr key={j}>
                      {fila.map((c, k) => (
                        <td key={k}>{enLinea(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        const Lista = b.tipo;
        return (
          <Lista key={i}>
            {b.items.map((t, j) => (
              <li key={j}>{enLinea(t)}</li>
            ))}
          </Lista>
        );
      })}
    </Contenedor>
  );
}

const Contenedor = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow-wrap: anywhere;
  h4 {
    font-size: 0.95rem;
    margin-top: 4px;
  }
  ul,
  ol {
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  code {
    padding: 1px 6px;
    border-radius: 6px;
    background: ${({ theme }) => theme.primarySoft};
    color: ${({ theme }) => theme.primary};
    font-size: 0.85em;
  }
  .tabla {
    max-width: 100%;
    overflow-x: auto;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  th,
  td {
    padding: 7px 10px;
    text-align: left;
    white-space: nowrap;
  }
  th {
    background: ${({ theme }) => theme.surfaceAlt};
    font-weight: 600;
  }
  td {
    border-top: 1px solid ${({ theme }) => theme.border};
    font-variant-numeric: tabular-nums;
  }
`;

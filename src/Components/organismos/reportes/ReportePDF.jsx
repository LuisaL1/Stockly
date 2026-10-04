import styled from "styled-components";
import { Document, Page, Text, View, Image, StyleSheet, PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import logo from "../../../assets/logo.png";
import { SpinnerLoader } from "../../moleculas/SpinnerLoader";
import { ErrorMolecula } from "../../moleculas/ErrorMolecula";
import { EstadoVacio } from "../../moleculas/EstadoVacio";
import { Boton } from "../../atomos/Boton";
import { LuDownload } from "react-icons/lu";

const MORADO = "#8800B3";

const estilos = StyleSheet.create({
  pagina: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#17131D" },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: MORADO,
    paddingBottom: 10,
    marginBottom: 16,
  },
  marca: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 30, height: 30 },
  empresa: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#17131D", marginBottom: 2 },
  pieMarca: { flexDirection: "row", alignItems: "center", gap: 4 },
  logoPie: { width: 10, height: 10 },
  titulo: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  fecha: { fontSize: 8, color: "#6B6472", textAlign: "right" },
  resumen: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#E4E1E6", minHeight: 22, alignItems: "center" },
  filaPar: { backgroundColor: "#F4F1EC" },
  cabecera: { backgroundColor: "#17131D", borderBottomWidth: 0 },
  celda: { flex: 1, paddingHorizontal: 6, paddingVertical: 4 },
  celdaCabecera: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 9 },
  pie: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 8, color: "#9AA2B4", flexDirection: "row", justifyContent: "space-between" },
});

// columnas: [{ clave, titulo, flex?, alinear?, formato? }]
function DocumentoReporte({ titulo, empresa, columnas, filas, orientacion, resumen }) {
  const ahora = new Date();
  const celda = (col, extra) => [estilos.celda, { flex: col.flex ?? 1, textAlign: col.alinear ?? "left" }, extra];

  return (
    <Document title={`${titulo} - Stockly`} author="MCCore">
      <Page size="A4" orientation={orientacion} style={estilos.pagina}>
        <View style={estilos.encabezado} fixed>
          <View style={estilos.marca}>
            <Image src={logo} style={estilos.logo} />
            <View>
              <Text style={estilos.empresa}>{empresa ?? "Stockly"}</Text>
              <Text style={estilos.titulo}>{titulo}</Text>
            </View>
          </View>
          <Text style={estilos.fecha}>
            {ahora.toLocaleDateString("es-CO")} {ahora.toLocaleTimeString("es-CO")}
          </Text>
        </View>
        {resumen && <Text style={estilos.resumen}>{resumen}</Text>}
        <View style={[estilos.fila, estilos.cabecera]} fixed>
          {columnas.map((col) => (
            <Text key={col.clave} style={celda(col, estilos.celdaCabecera)}>
              {col.titulo}
            </Text>
          ))}
        </View>
        {filas.map((fila, i) => (
          <View key={fila.id ?? i} style={[estilos.fila, i % 2 === 1 && estilos.filaPar]} wrap={false}>
            {columnas.map((col) => (
              <Text key={col.clave} style={celda(col)}>
                {col.formato ? col.formato(fila[col.clave], fila) : String(fila[col.clave] ?? "")}
              </Text>
            ))}
          </View>
        ))}
        <View style={estilos.pie} fixed>
          <View style={estilos.pieMarca}>
            <Image src={logo} style={estilos.logoPie} />
            <Text>Generado con Stockly · MCCore</Text>
          </View>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function ReportePDF({
  titulo,
  columnas,
  query,
  orientacion = "portrait",
  resumen,
  filtros,
  sinSeleccion,
  archivo,
}) {
  const { dataempresa } = useEmpresaStore();
  const filas = query?.data ?? [];

  let contenido;
  if (sinSeleccion) contenido = sinSeleccion;
  else if (query.isLoading) contenido = <SpinnerLoader texto="Generando reporte..." />;
  else if (query.error) contenido = <ErrorMolecula mensaje={query.error.message} reintentar={query.refetch} />;
  else if (!filas.length) contenido = <EstadoVacio titulo="Sin datos para este reporte" />;
  else {
    const doc = (
      <DocumentoReporte
        titulo={titulo}
        empresa={dataempresa?.nombre}
        columnas={columnas}
        filas={filas}
        orientacion={orientacion}
        resumen={typeof resumen === "function" ? resumen(filas) : resumen}
      />
    );
    contenido = (
      <>
        <div className="barra">
          <span>{filas.length} registros</span>
          <PDFDownloadLink document={doc} fileName={`${archivo ?? "reporte"}.pdf`}>
            {({ loading }) => (
              <Boton variante="secundario" tamano="sm" icono={<LuDownload />} cargando={loading} tabIndex={-1}>
                Descargar PDF
              </Boton>
            )}
          </PDFDownloadLink>
        </div>
        <PDFViewer className="visor" showToolbar>
          {doc}
        </PDFViewer>
      </>
    );
  }

  return (
    <Container>
      <header>
        <h2>{titulo}</h2>
        {filtros && <div className="filtros">{filtros}</div>}
      </header>
      {contenido}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 70vh;
  header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    h2 {
      font-size: 1.15rem;
      font-weight: 600;
    }
  }
  .filtros {
    max-width: 420px;
  }
  .barra {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.textMuted};
  }
  .visor {
    width: 100%;
    height: 75vh;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radius};
    background: ${({ theme }) => theme.surfaceAlt};
  }
`;

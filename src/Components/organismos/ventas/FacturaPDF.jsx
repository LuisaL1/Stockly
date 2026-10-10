import { abrev } from "../../../utils/unidades";
import { Document, Page, Text, View, Image, Link, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { MostrarVenta } from "../../../supabase/crudVentas";
import { MostrarConfigFacturacion } from "../../../supabase/crudFacturacion";
import { Boton } from "../../atomos/Boton";
import { formatearMoneda, formatearNumero } from "../../../utils/conversiones";
import { NombresMetodo } from "../../../utils/dataEstatica";
import { v } from "../../../styles/variables";
import logo from "../../../assets/logo.png";
import { medidasLogo, useLogoEmpresa } from "../../../hooks/useLogoEmpresa";

const MORADO = "#8800B3";
const TINTA = "#17131D";
const GRIS = "#6B6472";

const s = StyleSheet.create({
  pagina: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: TINTA },
  encabezado: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  emisor: { flexDirection: "row", gap: 12 },
  logo: { width: 40, height: 40 },
  empresa: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  pieMarca: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, marginTop: 4 },
  logoPie: { width: 9, height: 9 },
  gris: { color: GRIS },
  caja: { alignItems: "flex-end" },
  tipo: { fontSize: 8, color: MORADO, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 3 },
  numero: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  anulada: { marginTop: 4, color: "#DC2626", fontFamily: "Helvetica-Bold" },
  bloque: { flexDirection: "row", gap: 12, marginBottom: 16 },
  tarjeta: { flex: 1, padding: 10, backgroundColor: "#F4F1EC", borderRadius: 6 },
  etiqueta: { fontSize: 7.5, color: GRIS, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  negrita: { fontFamily: "Helvetica-Bold" },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#E4E1E6", paddingVertical: 6 },
  cabecera: { backgroundColor: TINTA, color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 8.5, borderBottomWidth: 0, borderRadius: 4 },
  cDesc: { flex: 3, paddingHorizontal: 6 },
  cNum: { flex: 1, paddingHorizontal: 6, textAlign: "right" },
  totales: { marginTop: 12, marginLeft: "auto", width: 220 },
  totalFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalFinal: { marginTop: 4, paddingTop: 6, borderTopWidth: 1.5, borderTopColor: MORADO, fontSize: 12, fontFamily: "Helvetica-Bold" },
  seccion: { marginTop: 16, padding: 10, borderRadius: 6, borderWidth: 0.8, borderColor: "#E4E1E6" },
  pagoFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  link: { color: MORADO, fontFamily: "Helvetica-Bold" },
  botonPago: {
    marginTop: 6,
    marginBottom: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: MORADO,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textDecoration: "none",
    textAlign: "center",
  },
  pie: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7.5, color: GRIS, textAlign: "center", lineHeight: 1.4 },
});

export function DocumentoFactura({ venta, cfg, empresa, logoEmpresa }) {
  const moneda = empresa?.simbolomoneda ?? "$";
  const dinero = (n) => formatearMoneda(n, moneda);
  const cliente = venta.clientes;
  const factura = venta.facturas?.[0] ?? venta.facturas;
  const electronica = factura?.tipo === "electronica";

  return (
    <Document title={`Factura ${venta.prefijo}-${venta.numero}`} author="MCCore · Stockly">
      <Page size="LETTER" style={s.pagina}>
        <View style={s.encabezado}>
          <View style={s.emisor}>
            {/* Logo de la empresa si lo subió; si no, el de Stockly. */}
            {logoEmpresa?.dataUrl ? (
              <Image src={logoEmpresa.dataUrl} style={medidasLogo(logoEmpresa, 44, 130)} />
            ) : (
              <Image src={logo} style={s.logo} />
            )}
            <View>
            <Text style={s.empresa}>{empresa?.nombre || cfg?.razon_social}</Text>
            {cfg?.razon_social && cfg.razon_social !== empresa?.nombre && <Text style={s.gris}>{cfg.razon_social}</Text>}
            {cfg?.nit && <Text style={s.gris}>NIT {cfg.nit}</Text>}
            {cfg?.regimen && <Text style={s.gris}>{cfg.regimen}</Text>}
            {cfg?.direccion && <Text style={s.gris}>{cfg.direccion}</Text>}
            {(cfg?.telefono || cfg?.email) && <Text style={s.gris}>{[cfg.telefono, cfg.email].filter(Boolean).join(" · ")}</Text>}
            </View>
          </View>
          <View style={s.caja}>
            <Text style={s.tipo}>{electronica ? "FACTURA ELECTRÓNICA DE VENTA" : "FACTURA DE VENTA"}</Text>
            <Text style={s.numero}>
              {venta.prefijo}-{venta.numero}
            </Text>
            <Text style={s.gris}>{new Date(venta.fecha).toLocaleString("es-CO")}</Text>
            {venta.estado === "anulada" && <Text style={s.anulada}>ANULADA</Text>}
          </View>
        </View>

        <View style={s.bloque}>
          <View style={s.tarjeta}>
            <Text style={s.etiqueta}>Cliente</Text>
            <Text style={s.negrita}>{cliente?.nombre ?? "Consumidor final"}</Text>
            {cliente?.documento && (
              <Text style={s.gris}>
                {cliente.tipo_documento} {cliente.documento}
              </Text>
            )}
            {cliente?.direccion && <Text style={s.gris}>{cliente.direccion}</Text>}
          </View>
          <View style={s.tarjeta}>
            <Text style={s.etiqueta}>Pago</Text>
            <Text style={s.negrita}>{NombresMetodo[venta.metodo_pago] ?? venta.metodo_pago}</Text>
            <Text style={s.gris}>{venta.estado === "pendiente" ? "Pago pendiente" : venta.estado === "anulada" ? "Anulada" : "Pagada"}</Text>
            <Text style={s.gris}>Bodega: {venta.bodegas?.nombre}</Text>
          </View>
        </View>

        <View style={[s.fila, s.cabecera]}>
          <Text style={s.cDesc}>Descripción</Text>
          <Text style={s.cNum}>Cant.</Text>
          <Text style={s.cNum}>Precio</Text>
          <Text style={s.cNum}>Desc.</Text>
          <Text style={s.cNum}>IVA</Text>
          <Text style={s.cNum}>Total</Text>
        </View>
        {venta.detalle_venta.map((d) => (
          <View key={d.id} style={s.fila} wrap={false}>
            <Text style={s.cDesc}>{d.descripcion}</Text>
            <Text style={s.cNum}>{formatearNumero(d.cantidad, Number.isInteger(Number(d.cantidad)) ? 0 : 2)}{d.unidad && d.unidad !== "und" ? ` ${abrev(d.unidad)}` : ""}</Text>
            <Text style={s.cNum}>{dinero(d.precio_unitario)}</Text>
            <Text style={s.cNum}>{Number(d.descuento) ? dinero(d.descuento) : "—"}</Text>
            <Text style={s.cNum}>{formatearNumero(d.iva)}%</Text>
            <Text style={s.cNum}>{dinero(d.total)}</Text>
          </View>
        ))}

        <View style={s.totales}>
          <View style={s.totalFila}>
            <Text style={s.gris}>Subtotal</Text>
            <Text>{dinero(venta.subtotal)}</Text>
          </View>
          {Number(venta.descuento) > 0 && (
            <View style={s.totalFila}>
              <Text style={s.gris}>Descuentos</Text>
              <Text>−{dinero(venta.descuento)}</Text>
            </View>
          )}
          <View style={s.totalFila}>
            <Text style={s.gris}>IVA</Text>
            <Text>{dinero(venta.impuesto)}</Text>
          </View>
          <View style={[s.totalFila, s.totalFinal]}>
            <Text>Total</Text>
            <Text>{dinero(venta.total)}</Text>
          </View>
        </View>

        {(() => {
          const pagos = (venta.pagos_venta ?? []).filter((p) => p.estado !== "anulado");
          const pagado = pagos.filter((p) => p.estado === "aprobado").reduce((a, p) => a + Number(p.monto), 0);
          const saldo = Math.max(Number(venta.total) - pagado, 0);
          const link = pagos.find((p) => p.metodo === "link_pago" && p.estado === "pendiente" && p.link_url)?.link_url;
          if (!pagos.length && !saldo) return null;
          return (
            <View style={s.seccion} wrap={false}>
              <Text style={s.etiqueta}>Pagos</Text>
              {pagos.map((p) => (
                <View key={p.id} style={s.pagoFila}>
                  <Text>
                    {NombresMetodo[p.metodo] ?? p.metodo}
                    {p.franquicia ? ` · ${p.franquicia}` : ""}
                    {p.referencia ? ` · Ref. ${p.referencia}` : ""}
                    {p.estado === "pendiente" ? " (pendiente)" : ""}
                  </Text>
                  <Text>{dinero(p.monto)}</Text>
                </View>
              ))}
              {pagos.some((p) => p.cambio > 0) && (
                <Text style={s.gris}>Cambio entregado: {dinero(pagos.reduce((a, p) => a + Number(p.cambio ?? 0), 0))}</Text>
              )}
              {saldo > 0 && venta.estado !== "anulada" && (
                <>
                  <View style={[s.pagoFila, { marginTop: 4 }]}>
                    <Text style={s.negrita}>Saldo por pagar</Text>
                    <Text style={s.negrita}>{dinero(saldo)}</Text>
                  </View>
                  {link && (
                    <>
                      <Link src={link} style={s.botonPago}>
                        Pagar en línea {dinero(saldo)} (tarjeta, PSE o Nequi)
                      </Link>
                      <Link src={link} style={s.link}>
                        {link}
                      </Link>
                    </>
                  )}
                  {cfg?.breb_llave && <Text style={s.gris}>Bre-B (desde cualquier banco): llave {cfg.breb_llave}</Text>}
                  {cfg?.numero_cuenta && (
                    <Text style={s.gris}>
                      Transferencia: {cfg.banco ?? "Banco"} · {cfg.tipo_cuenta ?? "Cuenta"} {cfg.numero_cuenta}
                      {cfg.titular_cuenta ? ` · ${cfg.titular_cuenta}` : ""}
                    </Text>
                  )}
                </>
              )}
            </View>
          );
        })()}

        <Text style={s.pie} fixed>
          {cfg?.resolucion_numero
            ? `Resolución DIAN ${cfg.resolucion_numero}${cfg.resolucion_fecha ? ` del ${cfg.resolucion_fecha}` : ""} · Rango ${cfg.prefijo}-${cfg.rango_desde ?? "?"} a ${cfg.prefijo}-${cfg.rango_hasta ?? "?"}\n`
            : ""}
          {electronica && factura?.cufe ? `CUFE: ${factura.cufe}\n` : ""}
          {cfg?.nota_pie ? `${cfg.nota_pie}` : ""}
        </Text>
        <View style={[s.pieMarca, { position: "absolute", bottom: 12, left: 36, right: 36 }]} fixed>
          <Image src={logo} style={s.logoPie} />
          <Text style={{ fontSize: 7.5, color: GRIS }}>Generada con Stockly · MCCore</Text>
        </View>
      </Page>
    </Document>
  );
}

// Botón que prepara y descarga el PDF de una venta.
export default function BotonFacturaPDF({ idVenta, variante = "secundario", texto = "Descargar PDF" }) {
  const { dataempresa } = useEmpresaStore();
  const venta = useQuery({ queryKey: ["venta", idVenta], queryFn: () => MostrarVenta(idVenta) });
  const cfg = useQuery({
    queryKey: ["config facturacion", dataempresa?.id],
    queryFn: () => MostrarConfigFacturacion(dataempresa.id),
    enabled: !!dataempresa?.id,
  });
  const { logo: logoEmpresa, cargando: cargandoLogo } = useLogoEmpresa();

  if (venta.isLoading || cfg.isLoading || cargandoLogo || !venta.data) {
    return (
      <Boton variante={variante} cargando={venta.isLoading || cfg.isLoading || cargandoLogo} disabled>
        {texto}
      </Boton>
    );
  }

  return (
    <PDFDownloadLink
      document={<DocumentoFactura venta={venta.data} cfg={cfg.data} empresa={dataempresa} logoEmpresa={logoEmpresa} />}
      fileName={`factura-${venta.data.prefijo}-${venta.data.numero}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {({ loading }) => (
        <Boton variante={variante} icono={<v.iconodescargar />} cargando={loading}>
          {texto}
        </Boton>
      )}
    </PDFDownloadLink>
  );
}

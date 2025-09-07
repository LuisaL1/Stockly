import styled from "styled-components";
import { Page, Text, View, Document, StyleSheet, PDFViewer, render } from '@react-pdf/renderer';
import { useProductosStore } from "../../../store/ProductosStore";
import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../../../store/EmpresaStore";



function StockInventarioValorado() {
    const{ReportInventarioValorado} = useProductosStore();
    const{dataempresa} = useEmpresaStore();
    const {data} = useQuery({
        queryKey:["reporte stock valorado", {_id_empresa:dataempresa?.id}],
        queryFn:()=> ReportInventarioValorado({_id_empresa:dataempresa?.id}),
        enabled:!!dataempresa,
    })

// calculamos el total general 
const totalGeneral = data?.reduce((acc, item)=> acc + item.total, 0) || 0;
const styles = StyleSheet.create({
    page:{flexDirection:"row",
        position: "relative"},
        section:{margin:10,padding:10,
            flexGrow:1},
        table: {width:"100%", margin: "auto", marginTop: 10},
            row: {
            flexDirection: "row",
            borderBottom: 1,
            borderBottomColor: "#121212",
            alignItems: "stretch",
            height: 24,
            borderLeftColor: "#000",
            borderLeft: 1,
            textAlign: "left",
            justifyContent: "flex-start",
            alignItems: "center",
            },
            cell: {
            flex: 1,
            textAlign: "center",
            borderLeftColor: "#000",
            justifyContent: "flex-start",
            alignItems: "center",
            },
            headerCell: {
            flex: 1,
            backgroundColor: "#dcdcdc",
            fontWeight: "bold",
            textAlign: "left",
            justifyContent: "flex-start",
            alignItems: "center",
            textAlign:"center"
            }
})
const currenData = new Date();
const formattedDate = `${currenData.toLocaleDateString()}
${currenData.toLocaleTimeString()}`
const renderTableRow=(rowData, isHeader =false)=>(
    <View style={styles.row} key={rowData.id}>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {
                rowData.descripcion
            }
        </Text>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {rowData.stock}
        </Text>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {rowData.preciocompra}
        </Text>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {rowData.total}
        </Text>
    </View>
);
  return (
    <Container>
        <PDFViewer style={{ width: "100%", height: "100%" }}>
            <Document title="Reporte de Stockly todos">
                <Page size="A4" orientation="portrait">
                    <View style={styles.page}>
                        <View style={styles.section}>
                        <Text>
                            Valor de inventario 
                        </Text>
                        <Text>
                            Total: {totalGeneral}
                        </Text>
                        <Text>
                           Fecha y hora del reporte: {formattedDate}
                        </Text>
                        <View>
                            {
                                renderTableRow(
                                    {
                                        descripcion:"Producto",
                                        stock: "Stock",
                                        preciocompra: "Precio",
                                        total: "Total"
                                    },
                                    true
                                )}
                            {data?.map((item)=>renderTableRow(item))}
                        </View>
                        </View>
                    </View>
                </Page>
            </Document>
        </PDFViewer>
    </Container>
  );
}
const Container = styled.div`
width: 100%;
height: 80vh;
.pdfviewer: {
    width: 100%;
    height: 100%;
}
`;
export default StockInventarioValorado;
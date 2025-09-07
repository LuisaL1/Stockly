import styled from "styled-components";
import { Page, Text, View, Document, StyleSheet, PDFViewer, render } from '@react-pdf/renderer';
import { useProductosStore } from "../../../store/ProductosStore";
import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../../../store/EmpresaStore";



function StockActualTodos() {
    const{ReportStockProductosTodos} = useProductosStore();
    const{dataempresa} = useEmpresaStore();
    const {data} = useQuery({
        queryKey:["reporte stock todos", {id_empresa:dataempresa?.id}],
        queryFn:()=> ReportStockProductosTodos({id_empresa:dataempresa?.id}),
        enabled:!!dataempresa,
    })
    const currenData = new Date();
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
                            Stock actual todos
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
export default StockActualTodos;
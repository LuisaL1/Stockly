import styled from "styled-components";
import { Page, Text, View, Document, StyleSheet, PDFViewer, render } from '@react-pdf/renderer';
import { useProductosStore } from "../../../store/ProductosStore";
import { useQuery } from "@tanstack/react-query";
import { useEmpresaStore } from "../../../store/EmpresaStore";
import { Buscador } from "../Buscador";
import { ListaGenerica } from "../ListaGenerica";
import { SpinnerLoader } from "../../moleculas/SpinnerLoader";
import { useState } from "react";



function KardexEntradasSalidas() {
    const [stateListaproductos, setstateListaProductos ] = useState(false)
    const{ReportKardexEntradaSalida, BuscarProductos, buscador, setBuscador, selectProductos, productosItemSelect} = useProductosStore();
    const{dataempresa} = useEmpresaStore();
    const {data, isLoading, error} = useQuery({
        queryKey:["reporte kardex entrada y salida", {_id_empresa:dataempresa?.id,_id_producto:productosItemSelect?.id}],
        queryFn:()=> ReportKardexEntradaSalida({_id_empresa:dataempresa?.id, _id_producto:productosItemSelect?.id}),
        enabled:!!dataempresa,
    });
        const {data: dataproductosbuscador, isLoading: ProductosBuscador, error: errorBuscador} = useQuery({
        queryKey:["buscar productos", {id_empresa:dataempresa?.id, descripcion: buscador}],
        queryFn:()=> BuscarProductos({id_empresa:dataempresa?.id, descripcion: buscador}),
        enabled:!!dataempresa,
    });

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
            {rowData.nombres}
        </Text>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {rowData.descripcion}
        </Text>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {rowData.tipo}
        </Text>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {rowData.cantidad}
        </Text>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {rowData.fecha}
        </Text>
        <Text style={[styles.cell,isHeader && styles.headerCell]}>
            {rowData.stock}
        </Text>
    </View>
);
  return (
    <Container>
        <Buscador funcion={()=>setstateListaProductos(!stateListaproductos)} setBuscador={setBuscador}/>
        {
            stateListaproductos && <ListaGenerica funcion={(p)=>{selectProductos(p), setBuscador("")}}
            setState={()=>setstateListaProductos(!stateListaproductos)} 
            data={dataproductosbuscador}/>
        }
        <PDFViewer style={{ width: "100%", height: "100%" }}>
            <Document title="Reporte de Stockly todos">
                <Page size="A4" orientation="landscape">
                    <View style={styles.page}>
                        <View style={styles.section}>
                        <Text>
                            Kardex de Entradas y Salidas por producto
                        </Text>
                        <Text>
                           Fecha y hora del reporte: {formattedDate}
                        </Text>
                        <View>
                            {
                                renderTableRow(
                                    {
                                        nombres: "Usuario",
                                        descripcion:"Producto",
                                        tipo: "Tipo",
                                        cantidad: "Cantidad",
                                        fecha: "Fecha",
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
display: flex;
flex-direction: column;
gap: 15px;
.pdfviewer: {
    width: 100%;
    height: 100%;
}
`;
export default KardexEntradasSalidas;
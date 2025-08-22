import   styled from "styled-components"
import { AccionTabla,v } from "../../index";
export function ContentAccionesTabla({funcionEditar,
    funcionEliminar}){
    return(<Container>
        <AccionTabla funcion={funcionEditar} 
        fontSize = "18px" 
        icono={<v.iconeditarTabla 
        color="#7d7d7d"/>}
        />
        <AccionTabla 
        funcion ={funcionEliminar}
        fontSize="18px"
        icono ={<v.iconeliminarTabla
        color="#f76e8e"/>}
        />
    </Container>);
}

const Container = styled.div`
display:flex;
gap:10px;
justify-content: center;
flex-wrap: wrap;
@media (max-width: 48em){
justify-content: end;
}

`
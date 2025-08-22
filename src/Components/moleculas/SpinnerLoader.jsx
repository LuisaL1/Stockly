import styled from "styled-components";
import {BounceLoader} from "react-spinners"
export function SpinnerLoader (){
    return (<Container>
        <BounceLoader color="#FFF140" size={200}/>
    </Container>)
}
const Container = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1000;
    background: ${({theme})=>theme.bgtotal};
    transition: all 0.3s;

`
import styled from "styled-components";
export function Btnfiltro({ bgcolor, textcolor, icono, funcion }) {
  return (
    <Container $textcolor={textcolor} $bgcolor={bgcolor} onClick={funcion}>
      <div className="contentIcon">
        <span>{icono}</span>
      </div>
    </Container>
  );
}

const Container = styled.div`
min-width: 50px;
min-height: 50px;
border-radius:50px;
background: linear-gradient(145deg, #f0f0f0, #cacaca);
color: ${(props) => props.$textcolor};
display: flex;
align-items:center;
justify-content: center;
font-size: 20px;
position: relative;
cursor: pointer;
.contentIcon{
    position: absolute;
    top: 25%;
    bottom: 25%;
    right:25;
    display: flex;
    justify-content: center;
    transition: 0.2s;
    &:hover{
        transform: scale(1.3);
    }
`;
import styled from "styled-components";
import {FaSearch} from "react-icons/fa"
export function Buscador({setBuscador,onFocus, funcion }){
    const buscar = (e) => {
        setBuscador(e.target.value)
    }
    function ejecutarfuncion(){
      if(funcion){
        funcion();
      }
    }
    return (
    <Container onClick={ejecutarfuncion}>
        <article className="content">
          <FaSearch className="icono"/>
            <input onFocus={onFocus} onChange={buscar}
              placeholder="...buscar"></input>
        </article>
    </Container>);
}
const Container = styled.div`
  background-color: ${(props) => props.theme.bg};
  border-radius: 30px;
  height: 60px;
  display: flex;
  align-items: center;
  color: ${(props) => props.theme.text};
  border: 1px solid #414244;
  padding: 0 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    border-color: #606060;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  &:focus-within {
    border-color: #ff6f00ff;
    box-shadow: 0 0 0 3px rgba(255, 123, 0, 0.1);
  }

  .content {
    display: flex;
    align-items: center;
    gap: 15px;
    width: 100%;
    position: relative;

    .icono {
      font-size: 20px;
      color: ${(props) => props.theme.text};
      opacity: 0.7;
      transition: opacity 0.3s ease;
      flex-shrink: 0;
    }

    input {
      font-size: 16px;
      width: 100%;
      outline: none;
      background: none;
      border: 0;
      color: ${(props) => props.theme.text};
      padding: 12px 0;
      
      &::placeholder {
        color: ${(props) => props.theme.text};
        opacity: 0.5;
        font-size: 16px;
      }

      &:focus + .icono {
        opacity: 1;
        color: #007bff;
      }
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    height: 50px;
    padding: 0 15px;

    .content {
      gap: 12px;

      .icono {
        font-size: 18px;
      }

      input {
        font-size: 14px;
        padding: 10px 0;

        &::placeholder {
          font-size: 14px;
        }
      }
    }
  }
`;

// Ejemplo de uso del componente
const SearchBar = () => {
  return (
    <Container>
      <div className="content">
        <div className="icono">🔍</div>
        <input 
          type="text" 
          placeholder="Buscar..." 
        />
      </div>
    </Container>
  );
};


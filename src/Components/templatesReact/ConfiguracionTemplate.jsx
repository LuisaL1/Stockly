import styled from "styled-components";
import fondocuadros from "../../assets/fondocuadros.svg";
import {  Link } from "react-router-dom";
import { DataModulosConfiguracion } from "../../utils/dataEstatica";
export function ConfiguracionTemplate() {
  
  return (
    <Container>
     
      <div id="cards">
        {DataModulosConfiguracion.map((item, index) => {
          return (
            <Link to={item.link} className={item.state?"card": "card false"} key={index}>

            
              <div className="card-content">
                <div className="card-image">
                  <img src={item.icono} />
                </div>
       

                <div className="card-info-wrapper">
                  <div className="card-info">
                    <i className="fa-duotone fa-unicorn"></i>
                    <div className="card-info-title">
                      <h3>{item.title}</h3>
                      <h4>{item.subtitle}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
const Container = styled.div`
  background-color: ${({ theme }) => theme?.bgtotal || "#121212"};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: start;
  min-height: 100vh;
  padding: 50px 20px;

  a {
    text-decoration: none;
    color: inherit;
  }

  #cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 30px;
    max-width: 1300px;
    width: 100%;
    margin-top: 40px;
  }

  .card {
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    position: relative;
    width: 300px;
    height: 260px;
    transition: 0.3s;
    border: 1px solid transparent;

    &:hover {
      border: 1px solid ${({ theme }) => theme?.bg5 || "#ffffff66"};
      box-shadow: 0 0 10px #ffa5004d;
    }

    &:hover .card-image img {
      filter: grayscale(0%);
      transform: scale(1.05);
    }
  }

  .card-content {
    background-color: ${({ theme }) => theme?.bgcards || "#1e1e1e"};
    border-radius: inherit;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding: 25px;
    z-index: 2;
  }

  .card-image {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 110px;

    img {
      max-height: 90px;
      max-width: 90px;
      filter: grayscale(100%);
      transition: 0.3s ease;
    }
  }

  .card-info-wrapper {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 0;
  }

  .card-info-title {
    text-align: center;
  }

  h3,
  h4 {
    color: ${({ theme }) => theme?.colorsubtitlecard || "#ffffff"};
    margin: 0;
    font-family: "Rubik", sans-serif;
    text-decoration: none;
  }

  h3 {
    font-size: 1.3em;
  }

  h4 {
    font-size: 0.95em;
    color: ${({ theme }) => theme?.colortitlecard || "#bbbbbb"};
    margin-top: 6px;
  }

  @media (max-width: 768px) {
    .card {
      width: 90%;
    }
  }

  @media (max-width: 480px) {
    .card {
      width: 100%;
    }

    .card-image img {
      max-height: 70px;
      max-width: 70px;
    }
  }
`;




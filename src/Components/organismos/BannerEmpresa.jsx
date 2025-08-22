import styled from "styled-components";
import { v } from "../../styles/variables";
import { CardDatosEmpresa, useEmpresaStore } from "../../index";
import { SpinnerLoader } from "../../index";
export function BannerEmpresa() {
  const { dataempresa, contadorusuarios } = useEmpresaStore();

  if (!dataempresa) {
    return <SpinnerLoader />;
  }

  return (
    <Container>
      <div className="content-wrapper-context">
        <span className="titulo">
          {<v.iconoempresa />} {dataempresa.nombre}
        </span>
        <div className="content-text">Stockly, tu mejor aliado</div>

        <ContentCards>
          <CardDatosEmpresa titulo="Moneda" valor={dataempresa.simbolomoneda} />
          <CardDatosEmpresa titulo="Usuarios" valor={contadorusuarios} />
        </ContentCards>
      </div>

      <div className="contentsvg">
        <svg
          viewBox="0 0 492 253"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <g filter="url(#filter0_f_934_1718)">
            <path
              d="M436.631 215.884C513.562 314.19 490.786 459.853 385.76 610.548C280.733 691.927 133.227 608.889 56.2961 510.583C-20.6352 412.277 2.14047 266.613 107.167 185.234C212.193 103.855 359.699 117.578 436.631 215.884Z"
              fill="#e28000ff"
            />
            <path
              d="M436.631 285.2C513.562 383.506 490.786 529.169 385.76 610.548C280.733 691.927 133.227 678.205 56.2961 579.899C-20.6352 481.593 2.14047 335.93 107.167 254.551C212.193 173.172 359.699 186.894 436.631 285.2Z"
              fill="white"
            />
          </g>
          <defs>
            <filter
              id="filter0_f_934_1718"
              x="-120.728"
              y="0.703659"
              width="734.383"
              height="794.376"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="BackgroundImageFix"
                result="shape"
              />
              <feGaussianBlur
                stdDeviation="65.7243"
                result="effect1_foregroundBlur_934_1718"
              />
            </filter>
          </defs>
        </svg>
      </div>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  overflow: hidden;
  position: relative; 

  .content-wrapper-context {
    z-index: 1; 
    display: flex;
    flex-direction: column;
    padding: 20px;
    gap: 10px;
  }

  .contentsvg {
    transition: cubic-bezier(0.4, 0, 0.2, 1) 0.6s;
    position: absolute;
    width: 100%;
    height: 100%;
    bottom: -500px;
    opacity: 0;
+   z-index: -1; /* SVG al fondo */

    svg {
      width: 100%;
      height: 100%;
    }
  }

  &:hover .contentsvg {
    bottom: -100px;
    opacity: 1;
  }
`;

const ContentCards = styled.div`
  display: flex;
  gap: 10px;
  padding-top: 15px;
  cursor: pointer;
`;

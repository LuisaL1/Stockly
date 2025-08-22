import styled from "styled-components";
import { LinksArray, SecondarylinksArray, ToggleTema, BannerEmpresa } from "../../index";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { v } from "../../styles/variables";

export function MenuHambur() {
  const [click, setClick] = useState(false);

  return (
    <Container>
      <NavBar>
        <HamburgerMenu onClick={() => setClick(!click)}>
          <label className={click ? "toggle active" : "toggle"}>
            <div className="bar" id="bar1" />
            <div className="bar" id="bar2" />
            <div className="bar" id="bar3" />
          </label>
        </HamburgerMenu>

        <Menu $click={click.toString()}>
          {LinksArray.map(({ icon, label, to }) => (
            <div onClick={() => setClick(false)} className="LinkContainer" key={label}>
              <NavLink to={to} className="Links">
                <div className="Linkicon">{icon}</div>
                <span>{label}</span>
              </NavLink>
            </div>
          ))}
          <Divider />
          {SecondarylinksArray.map(({ icon, label, to }) => (
            <div className="LinkContainer" key={label} onClick={() => setClick(false)}>
              <NavLink to={to} className="Links">
                <div className="Linkicon">{icon}</div>
                <span>{label}</span>
              </NavLink>
            </div>
          ))}
          
          <ToggleTema />
          <Divider />
        </Menu>
      </NavBar>
    </Container>
  );
}

// Estilos
const Container = styled.div`
  background-color: ${(props) => props.theme.body};
`;

const NavBar = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100vh;
`;

const HamburgerMenu = styled.span`
  position: fixed;
  top: 2rem;
  left: 1rem;
  z-index: 9999;

  .toggle {
    position: relative;
    width: 35px;
    height: 30px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .bar {
    position: absolute;
    width: 30px;
    height: 3px;
    background-color: ${(props) =>
      props.theme.name === "dark" ? "#ccc" : props.theme.text}; 
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  #bar1 {
    top: 0;
  }

  #bar2 {
    top: 10px;
  }

  #bar3 {
    top: 20px;
  }

  .toggle.active #bar1 {
    transform: rotate(45deg);
    top: 10px;
  }

  .toggle.active #bar2 {
    opacity: 0;
  }

  .toggle.active #bar3 {
    transform: rotate(-45deg);
    top: 10px;
  }
    
`;

const Menu = styled.div`
  display: flex;
  align-items: center;
  list-style: none;
  z-index: 10;
  flex-direction: column;
  position: fixed;
  justify-content: center;
  top: 0;
  left: 0;
  right:0;
  bottom:0;
  width: 100vw; 
  background-color: ${(props) => `rgba(${props.theme.bodyRgba},0.85)`};
  backdrop-filter: blur(3px);
  transform: ${(props) =>
  props.$click == "true" ? "translateY(0)" : "translateY(1000%)"};
  transition: all 0.3s ease;
  .LinkContainer{
  &:hover{
     background: ${(props) => props.theme.bgAlpha};
  }
   

  .Links{
    width:100vw;
    display:flex;
    text-decoration: none;
    color: ${(props) => props.theme.text};
    height: 80px;
    .Linkicon{
    padding: ${v.smSpacing} ${v.mdSpacing};
    display: flex;
    svg{
    font-size: 25px;
    }
    }
  }
  }
 
`;

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background: ${(props) => props.theme.bg4};
  margin: ${v.lgSpacing} 0;
`;


import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html {
    color-scheme: ${({ theme }) => theme.name};
    /* Reserva el espacio de la barra: el contenido no salta al aparecer/desaparecer ni al abrir modales. */
    scrollbar-gutter: stable;
  }
  body {
    background-color: ${({ theme }) => theme.bg};
    color: ${({ theme }) => theme.text};
    font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  button, input, select, textarea {
    font: inherit;
    color: inherit;
  }
  /* Cambios de color suaves en todo lo interactivo (los componentes pueden definir los suyos). */
  button, a, input, select, textarea, [role="button"] {
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
  }
  /* Solo en ventanas emergentes (modales, Novandra, paneles): su scroll no mueve la página de fondo.
     En el resto (ticket, listas, menú) el scroll pasa a la página al llegar al final, como es normal. */
  [role="dialog"], [role="dialog"] * {
    overscroll-behavior: contain;
  }
  a {
    color: inherit;
  }
  /* Selectores: flecha propia (la del navegador queda pegada al borde y cambia en cada sistema).
     !important porque cada componente define su propio "background" y "padding". */
  select:not([multiple]):not([size]) {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${({ theme }) => encodeURIComponent(theme.textMuted)}' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 14px center !important;
    background-size: 15px !important;
    padding-right: 40px !important;
    cursor: pointer;
    text-overflow: ellipsis;
    transition: border-color 0.15s, box-shadow 0.15s;
    &:hover:not(:disabled) {
      border-color: ${({ theme }) => theme.primary};
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }
  select option {
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
  }
  img {
    max-width: 100%;
  }
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.primary};
    outline-offset: 2px;
  }
  ::selection {
    background: ${({ theme }) => theme.primarySoft};
  }
  /* Barras de scroll delgadas, redondeadas y sin fondo (Chrome, Edge y Safari). */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-track,
  ::-webkit-scrollbar-corner {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colorScroll};
    background-clip: padding-box;
    border: 3px solid transparent;
    border-radius: 999px;
    min-height: 40px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: ${({ theme }) => theme.textMuted};
  }
  /* Dentro de listas, paneles y tarjetas: barra fina que solo aparece al pasar el mouse. */
  *:not(html)::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *:not(html)::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-width: 1px;
  }
  *:not(html):hover::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colorScroll};
  }
  /* Firefox */
  @supports not selector(::-webkit-scrollbar) {
    html {
      scrollbar-width: thin;
      scrollbar-color: ${({ theme }) => theme.colorScroll} transparent;
    }
    body * {
      scrollbar-width: thin;
      scrollbar-color: transparent transparent;
    }
    body *:hover {
      scrollbar-color: ${({ theme }) => theme.colorScroll} transparent;
    }
  }
  /* Quien pidió menos movimiento en su sistema no ve animaciones. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* SweetAlert2 con los colores del tema */
  .swal2-popup {
    background: ${({ theme }) => theme.surface};
    color: ${({ theme }) => theme.text};
    border-radius: ${({ theme }) => theme.radiusLg};
    font-family: inherit;
  }
  .swal2-title, .swal2-html-container {
    color: ${({ theme }) => theme.text};
  }
`;

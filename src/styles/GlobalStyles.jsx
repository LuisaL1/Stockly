import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html {
    color-scheme: ${({ theme }) => theme.name};
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
  a {
    color: inherit;
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
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colorScroll};
    border-radius: 10px;
    border: 2px solid ${({ theme }) => theme.bg};
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

import { useEffect, useState } from "react";
import { ThemeProvider } from "styled-components";
import { AuthContextProvider } from "./context/AuthContext";
import { MyRoutes } from "./routers/routes";
import { Light, Dark } from "./styles/themes";
import { GlobalStyle } from "./styles/GlobalStyles";
import { ThemeContext } from "./context/contextoTema";

function temaInicial() {
  try {
    const guardado = localStorage.getItem("stockly-tema");
    if (guardado === "light" || guardado === "dark") return guardado;
  } catch {
    // localStorage no disponible: usamos la preferencia del sistema
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const [theme, setTheme] = useState(temaInicial);

  useEffect(() => {
    try {
      localStorage.setItem("stockly-tema", theme);
    } catch {
      // sin persistencia
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <ThemeProvider theme={theme === "light" ? Light : Dark}>
        <GlobalStyle />
        <AuthContextProvider>
          <MyRoutes />
        </AuthContextProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;

import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import App from "./components/App.jsx";

export function render() {
  // Durante SSR, o AuthContext inicia com loading: false (evita mismatch)
  // O cliente irá definir loading: true temporariamente durante a inicialização
  // Isso garante que o HTML renderizado no servidor corresponda ao estado inicial do cliente
  const html = renderToString(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
  return { html };
}


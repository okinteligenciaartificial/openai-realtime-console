import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import App from "./components/App";

export function render() {
  const html = renderToString(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
  return { html };
}

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import App from "./components/App";
import "./base.css";

ReactDOM.hydrateRoot(
  document.getElementById("root"),
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

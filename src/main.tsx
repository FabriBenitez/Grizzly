import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { AuthSupabaseProvider } from "./shared/auth/AuthSupabaseProvider";
import "./shared/styles/globals.scss";
import "./styles.css";

const contenedorRaiz = document.getElementById("root");

if (!contenedorRaiz) {
  throw new Error("No se encontró el contenedor raíz de la aplicación.");
}

ReactDOM.createRoot(contenedorRaiz).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthSupabaseProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </AuthSupabaseProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

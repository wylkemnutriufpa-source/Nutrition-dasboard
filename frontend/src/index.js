import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"));

// StrictMode desabilitado temporariamente para evitar double renders
// que causam erros removeChild durante navegação
root.render(<App />);

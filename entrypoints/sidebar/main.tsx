import React from "react";
import ReactDOM from "react-dom/client";
import "@/assets/tailwind.css";
import '../popup/style.css';
import App from "../popup/App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

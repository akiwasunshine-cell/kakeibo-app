import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// グラフの色がCSS変数を参照するため、CSSを先に読み込む
import "./App.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

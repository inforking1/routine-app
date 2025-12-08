/// <reference types="vite-plugin-pwa/client" />
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { HashRouter } from "react-router-dom";
// ✅ PWA SW 등록 (vite-plugin-pwa)
import { registerSW } from "virtual:pwa-register";

// ⬇️ 추가: /auth/callback 구간에서는 SW 등록을 생략
const isAuthCallback = window.location.hash.includes("/auth/callback");
if (!isAuthCallback) {
  registerSW({ immediate: true });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

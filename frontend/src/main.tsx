import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the service worker only in production so dev reloads aren't
// stuck behind stale caches. Failures are non-fatal (Safari private mode,
// insecure origins, etc.).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl, { scope: import.meta.env.BASE_URL })
      .catch((err) => console.warn("[sw] registration failed", err));
  });
}

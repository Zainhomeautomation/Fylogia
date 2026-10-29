import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initializeLocalLibrary } from "./local-library";

const root = createRoot(document.getElementById("root")!);
root.render(
  <p className="startup-message" role="status">
    Opening your library…
  </p>,
);
void initializeLocalLibrary().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(import.meta.env.BASE_URL + "sw.js", {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {
        /* Reading remains available without offline caching. */
      });
  });
}

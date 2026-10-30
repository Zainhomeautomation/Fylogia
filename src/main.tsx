import { initializeCloudSync } from "./cloud-sync";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrandMark } from "./BrandMark";
import App from "./App.tsx";
import { initializeLocalLibrary } from "./local-library";

const root = createRoot(document.getElementById("root")!);
root.render(
  <p className="startup-message" role="status">
    <BrandMark />
    Opening your library…
  </p>,
);
void initializeLocalLibrary().then(async () => {
  await initializeCloudSync();
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

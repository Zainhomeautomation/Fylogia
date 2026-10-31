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
        updateViaCache: "none",
      })
      .then((registration) => {
        // register() already checks on launch. Do not race its installation
        // with an immediate explicit update (WebKit can reject that request).
        let last = Date.now();
        const check = () => {
          if (
            document.hidden ||
            !navigator.onLine ||
            registration.installing ||
            registration.waiting ||
            Date.now() - last < 60_000
          )
            return;
          last = Date.now();
          void registration.update().catch(() => {});
        };
        window.addEventListener("online", check);
        document.addEventListener("visibilitychange", check);
      })
      .catch(() => {
        /* Reading remains available without offline caching. */
      });
  });
}

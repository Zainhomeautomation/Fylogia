import { hasPendingLocalOperations } from "./pending-operations";
import { useEffect, useState } from "react";
import { getPersistenceStatus } from "./local-library";

// Never reload an open reader or interrupt a pending local save. The user
// chooses when to adopt a newly installed shell; downloads use separate stores.
export function PwaUpdates() {
  const [available, setAvailable] = useState(false);
  const [reading, setReading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let controlled = Boolean(navigator.serviceWorker.controller);
    const changed = () => {
      if (controlled) setAvailable(true);
      controlled = true;
    };
    const inspect = () =>
      setReading(Boolean(document.querySelector(".reader")));
    const observer = new MutationObserver(inspect);
    observer.observe(document.getElementById("root")!, {
      childList: true,
      subtree: true,
    });
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    return () => {
      observer.disconnect();
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
  }, []);
  if (!available || reading) return null;
  return (
    <aside className="pwa-update" aria-label="Application update">
      <span>A fresh version of Fylogia is ready.</span>
      <button
        className="secondary"
        onClick={() => {
          const state = getPersistenceStatus();
          if (state.saving || !state.durable || hasPendingLocalOperations()) {
            setWaiting(true);
            return;
          }
          location.reload();
        }}
      >
        Update Fylogia
      </button>
      {waiting && (
        <small role="status">
          Wait for your library to finish saving, then try again.
        </small>
      )}
    </aside>
  );
}

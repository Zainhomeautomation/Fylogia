import { useSyncExternalStore } from "react";
import { subscribeToUpdates, updateReady } from "./pwa-update";
export function PwaUpdateNotice() {
  const ready = useSyncExternalStore(
    subscribeToUpdates,
    updateReady,
    () => false,
  );
  return ready ? (
    <p className="notice" role="status">
      A new version of Fylogia is ready. Finish reading, then reopen the app to
      use it.
    </p>
  ) : null;
}

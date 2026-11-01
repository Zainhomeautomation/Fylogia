import { useSyncExternalStore } from "react";

const motionQuery = "(prefers-reduced-motion: reduce)";
const getSnapshot = () => matchMedia(motionQuery).matches;
const getServerSnapshot = () => false;

function subscribe(update: () => void) {
  const media = matchMedia(motionQuery);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}

export function ReadingMotionNote() {
  const reduced = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return reduced ? (
    <p className="quiet" role="status">
      Your device’s Reduce Motion setting is on. Pages still turn, with the
      paper animation disabled.
    </p>
  ) : null;
}

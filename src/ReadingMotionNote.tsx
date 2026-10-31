import { useEffect, useState } from "react";
export function ReadingMotionNote() {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced ? (
    <p className="quiet" role="status">
      Your device’s Reduce Motion setting is on. Pages still turn, with the
      paper animation disabled.
    </p>
  ) : null;
}

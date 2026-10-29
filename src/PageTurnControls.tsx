import { useRef, useState } from "react";
const tutorialKey = "fylogia.page-turn-tutorial.v1";
type Curl = {
  begin: (forward: boolean) => void;
  move: (p: number) => void;
  end: (commit: boolean, turn: () => void) => void;
};
export function PageTurnControls({
  curl,
  previous,
  next,
}: {
  curl: Curl;
  previous?: () => void;
  next?: () => void;
}) {
  const [learned, setLearned] = useState(() => {
    try {
      return localStorage.getItem(tutorialKey) === "done";
    } catch {
      return false;
    }
  });
  const gesture = useRef<{
    x: number;
    y: number;
    progress: number;
    forward: boolean;
    width: number;
    height: number;
    slop: number;
    dragging: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const surfaceFor = (button: HTMLElement) =>
    button
      .closest(".reader")!
      .querySelector<HTMLElement>(".reader-viewport,.pdf-spread")!;
  function learn() {
    setLearned(true);
    try {
      localStorage.setItem(tutorialKey, "done");
    } catch {
      /* Reading remains available without storage. */
    }
  }
  function turn(forward: boolean) {
    (forward ? next : previous)?.();
    learn();
  }
  function cancel() {
    const g = gesture.current;
    gesture.current = null;
    suppressClick.current = true;
    if (g?.dragging) curl.end(false, () => {});
  }
  return (
    <div
      className="page-turn-controls"
      aria-label="Page corners"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {!learned && (
        <aside className="turn-tutorial" aria-label="Page turning guide">
          <span>Drag or swipe to turn pages</span>
          <small className="sr-only">
            Drag the folded corner inward. Release halfway to turn; drag back to
            cancel.
          </small>
          <button onClick={learn}>Got it</button>
        </aside>
      )}
      {[false, true].map(
        (forward) =>
          (forward ? next : previous) && (
            <button
              key={String(forward)}
              className={`page-corner ${forward ? "next-corner" : "previous-corner"} ${!learned ? "hint-corner" : ""}`}
              aria-label={
                forward
                  ? "Drag or tap to turn forward"
                  : "Drag or tap to turn backward"
              }
              title="Drag or tap this corner to turn a page"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                if (e.button !== 0 || !e.isPrimary) return;
                const surface = surfaceFor(e.currentTarget);
                gesture.current = {
                  x: e.clientX,
                  y: e.clientY,
                  progress: 0,
                  forward,
                  height: surface.clientHeight,
                  width:
                    surface.clientWidth /
                    (surface.dataset.spread === "2" ? 2 : 1),
                  slop: e.pointerType === "touch" ? 12 : 6,
                  dragging: false,
                };
                suppressClick.current = false;
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const g = gesture.current;
                if (!g) return;
                const dx = e.clientX - g.x,
                  dy = e.clientY - g.y;
                if (!g.dragging) {
                  if (Math.abs(dx) <= g.slop && Math.abs(dy) <= g.slop) return;
                  if (Math.abs(dy) > Math.abs(dx) * 1.2) {
                    cancel();
                    return;
                  }
                  g.dragging = true;
                  curl.begin(g.forward);
                }
                g.progress = Math.max(
                  0,
                  Math.min(0.98, (dx * (g.forward ? -1 : 1)) / g.width),
                );
                curl.move(g.progress);
              }}
              onPointerUp={(e) => {
                const g = gesture.current;
                gesture.current = null;
                if (!g) return;
                suppressClick.current = true;
                const surface = surfaceFor(e.currentTarget);
                const unchanged =
                  surface.clientHeight === g.height &&
                  Math.abs(
                    surface.clientWidth /
                      (surface.dataset.spread === "2" ? 2 : 1) -
                      g.width,
                  ) < 1;
                if (g.dragging)
                  curl.end(unchanged && g.progress >= 0.35, () =>
                    turn(g.forward),
                  );
                else if (
                  unchanged &&
                  Math.hypot(e.clientX - g.x, e.clientY - g.y) <= g.slop
                )
                  turn(g.forward);
              }}
              onPointerCancel={cancel}
              onLostPointerCapture={() => {
                if (gesture.current) cancel();
              }}
              onClick={(e) => {
                if (e.detail === 0) {
                  turn(forward);
                  return;
                }
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                turn(forward);
              }}
            >
              <span aria-hidden="true" className="folded-paper-corner" />
            </button>
          ),
      )}
    </div>
  );
}

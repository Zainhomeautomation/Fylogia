import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    progress: number;
    forward: boolean;
    width: number;
    height: number;
  } | null>(null);
  const ignoreClick = useRef(false);
  function learn() {
    setLearned(true);
    try {
      localStorage.setItem(tutorialKey, "done");
    } catch {
      /* Reading works without storage. */
    }
  }
  function turn(forward: boolean) {
    (forward ? next : previous)?.();
    learn();
  }
  return (
    <div
      className="page-turn-controls"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {!learned && (
        <aside className="turn-tutorial" aria-label="Page turning guide">
          <span>Drag or swipe to turn pages</span>
          <small>
            Try dragging the folded corner inward. Release halfway to turn; drag
            back to cancel.
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
              title="Drag or swipe to turn pages"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const surface = e.currentTarget.closest(
                  ".reader-viewport, .pdf-spread",
                ) as HTMLElement;
                gesture.current = {
                  x: e.clientX,
                  progress: 0,
                  forward,
                  height: surface.clientHeight,
                  width:
                    surface.clientWidth /
                    (surface.dataset.spread === "2" ? 2 : 1),
                };
                ignoreClick.current = false;
                e.currentTarget.setPointerCapture(e.pointerId);
                curl.begin(forward);
              }}
              onPointerMove={(e) => {
                const g = gesture.current;
                if (!g) return;
                const distance = (e.clientX - g.x) * (g.forward ? -1 : 1);
                g.progress = Math.max(0, Math.min(0.98, distance / g.width));
                if (Math.abs(e.clientX - g.x) > 5) ignoreClick.current = true;
                curl.move(g.progress);
              }}
              onPointerUp={(e) => {
                const g = gesture.current;
                gesture.current = null;
                if (!g) return;
                const surface = e.currentTarget.closest(
                  ".reader-viewport, .pdf-spread",
                ) as HTMLElement;
                const unchanged =
                  surface.clientHeight === g.height &&
                  Math.abs(
                    surface.clientWidth /
                      (surface.dataset.spread === "2" ? 2 : 1) -
                      g.width,
                  ) < 1;
                curl.end(unchanged && g.progress >= 0.35, () =>
                  turn(g.forward),
                );
              }}
              onPointerCancel={() => {
                gesture.current = null;
                ignoreClick.current = true;
                curl.end(false, () => {});
              }}
              onLostPointerCapture={() => {
                if (!gesture.current) return;
                gesture.current = null;
                ignoreClick.current = true;
                curl.end(false, () => {});
              }}
              onClick={() => {
                if (!ignoreClick.current) turn(forward);
                ignoreClick.current = false;
              }}
            >
              {forward ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          ),
      )}
    </div>
  );
}

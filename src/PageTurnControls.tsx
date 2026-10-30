import { pageBox } from "./paper-surface";
import { useEffect, useRef, useState } from "react";
const tutorialKey = "fylogia.page-turn-tutorial.v1";
type Curl = {
  begin: (forward: boolean) => boolean;
  move: (p: number, vertical?: number) => void;
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
    id: number;
    native: boolean;
    x: number;
    y: number;
    progress: number;
    forward: boolean;
    width: number;
    height: number;
    pageHeight: number;
    slop: number;
    dragging: boolean;
  } | null>(null);
  const touchOwned = useRef(false);
  const touchBlocked = useRef(false);
  const lastEnd = useRef(-Infinity);
  const suppressClick = useRef(false);
  useEffect(() => {
    const reset = () => {
      if (!document.hidden) return;
      const g = gesture.current;
      gesture.current = null;
      touchOwned.current = false;
      touchBlocked.current = false;
      suppressClick.current = true;
      // oxlint-disable-next-line react/purity -- Event-only gesture helper.
      lastEnd.current = performance.now();
      if (g?.dragging) curl.end(false, () => {});
    };
    document.addEventListener("visibilitychange", reset);
    return () => document.removeEventListener("visibilitychange", reset);
  }, [curl]);
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
    // oxlint-disable-next-line react/purity -- Event-only gesture helper.
    lastEnd.current = performance.now();
    if (g?.dragging) curl.end(false, () => {});
  }
  function start(
    button: HTMLElement,
    x: number,
    y: number,
    id: number,
    forward: boolean,
    native: boolean,
    touch: boolean,
  ) {
    const surface = surfaceFor(button),
      box = pageBox(surface, forward);
    gesture.current = {
      id,
      native,
      x,
      y,
      progress: 0,
      forward,
      height: surface.clientHeight,
      width: box.width,
      pageHeight: box.height,
      slop: touch ? 12 : 6,
      dragging: false,
    };
    suppressClick.current = false;
  }
  function move(x: number, y: number) {
    const g = gesture.current;
    if (!g) return;
    const dx = x - g.x,
      dy = y - g.y;
    if (!g.dragging) {
      if (Math.abs(dx) <= g.slop && Math.abs(dy) <= g.slop) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.2) {
        cancel();
        return;
      }
      if (!curl.begin(g.forward)) {
        gesture.current = null;
        suppressClick.current = true;
        return;
      }
      g.dragging = true;
    }
    g.progress = Math.max(
      0,
      Math.min(1.98, (dx * (g.forward ? -1 : 1)) / g.width),
    );
    curl.move(g.progress, dy / g.pageHeight);
  }
  function finish(button: HTMLElement, x: number, y: number) {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    suppressClick.current = true;
    // oxlint-disable-next-line react/purity -- Event-only gesture helper.
    lastEnd.current = performance.now();
    const surface = surfaceFor(button);
    const unchanged =
      surface.clientHeight === g.height &&
      Math.abs(pageBox(surface, g.forward).width - g.width) < 1;
    if (g.dragging)
      curl.end(unchanged && g.progress >= 0.35, () => turn(g.forward));
    else if (unchanged && Math.hypot(x - g.x, y - g.y) <= g.slop)
      turn(g.forward);
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
                if (!e.isPrimary) {
                  cancel();
                  return;
                }
                if (
                  e.button !== 0 ||
                  (e.pointerType === "touch" && touchOwned.current)
                )
                  return;
                start(
                  e.currentTarget,
                  e.clientX,
                  e.clientY,
                  e.pointerId,
                  forward,
                  false,
                  e.pointerType === "touch",
                );
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  /* Native touch ownership does not depend on pointer capture. */
                }
              }}
              onPointerMove={(e) => {
                const g = gesture.current;
                if (g && !g.native && g.id === e.pointerId)
                  move(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                const g = gesture.current;
                if (g && !g.native && g.id === e.pointerId)
                  finish(e.currentTarget, e.clientX, e.clientY);
              }}
              onPointerCancel={(e) => {
                const g = gesture.current;
                if (g && !g.native && g.id === e.pointerId) cancel();
              }}
              onLostPointerCapture={() => {
                if (gesture.current && !gesture.current.native) cancel();
              }}
              onTouchStart={(e) => {
                touchOwned.current = true;
                if (e.touches.length !== 1 || touchBlocked.current) {
                  touchBlocked.current = true;
                  cancel();
                  return;
                }
                const t = e.touches[0];
                start(
                  e.currentTarget,
                  t.clientX,
                  t.clientY,
                  t.identifier,
                  forward,
                  true,
                  true,
                );
              }}
              onTouchMove={(e) => {
                if (touchBlocked.current) return;
                if (e.touches.length !== 1) {
                  touchBlocked.current = true;
                  cancel();
                  return;
                }
                const t = Array.from(e.touches).find(
                  (t) => t.identifier === gesture.current?.id,
                );
                if (t) move(t.clientX, t.clientY);
              }}
              onTouchEnd={(e) => {
                if (e.touches.length) {
                  touchBlocked.current = true;
                  cancel();
                  return;
                }
                const t = Array.from(e.changedTouches).find(
                  (t) => t.identifier === gesture.current?.id,
                );
                if (!touchBlocked.current && t)
                  finish(e.currentTarget, t.clientX, t.clientY);
                touchOwned.current = false;
                touchBlocked.current = false;
              }}
              onTouchCancel={() => {
                cancel();
                touchOwned.current = false;
                touchBlocked.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  suppressClick.current = false;
              }}
              onClick={() => {
                if (
                  suppressClick.current &&
                  performance.now() - lastEnd.current < 700
                ) {
                  suppressClick.current = false;
                  return;
                }
                suppressClick.current = false;
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

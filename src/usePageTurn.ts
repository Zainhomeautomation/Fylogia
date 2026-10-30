import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { capture, paper, pageBox } from "./paper-surface";
type Interaction = {
  previous: boolean;
  next: boolean;
  step: (forward: boolean) => void;
  blocked?: () => boolean;
};
type Session = {
  controller: AbortController;
  view?: Awaited<ReturnType<typeof paper>>;
  surface: HTMLElement;
  underlay?: HTMLElement;
  ready: Promise<void>;
  distance: number;
  vertical: number;
  ending: boolean;
  apply?: () => void;
  applied: boolean;
  applying: boolean;
  finishing: boolean;
  motionless: boolean;
  frame: number;
  timer?: ReturnType<typeof setTimeout>;
};
export function usePageTurn(
  ref: RefObject<HTMLDivElement | null>,
  page: number,
  enabled = true,
  prepare?: (
    forward: boolean,
    signal: AbortSignal,
  ) => Promise<HTMLElement | undefined>,
  interaction?: Interaction,
) {
  const latest = useRef({ enabled, prepare, interaction, page });
  useLayoutEffect(() => {
    latest.current = { enabled, prepare, interaction, page };
  }, [enabled, prepare, interaction, page]);
  const engine = useMemo(
    () =>
      createEngine(
        // Getters are stored, never invoked by createEngine during render.
        // oxlint-disable-next-line react/refs
        () => ref.current,
        // oxlint-disable-next-line react/refs
        () => latest.current,
      ),
    [ref],
  );
  useLayoutEffect(() => engine.connect(), [engine]);
  useLayoutEffect(() => {
    if (!enabled) engine.cancel();
  }, [enabled, engine]);
  return engine.api;
}
function cell<T>(value: T) {
  return { current: value };
}
function createEngine(
  getSurface: () => HTMLDivElement | null,
  getOptions: () => {
    enabled: boolean;
    page: number;
    prepare?: (
      forward: boolean,
      signal: AbortSignal,
    ) => Promise<HTMLElement | undefined>;
    interaction?: Interaction;
  },
) {
  const current = cell<Session | null>(null),
    queued = cell<{ forward: boolean; turn: () => void } | null>(null);
  const alive = cell(true);
  const gesture = cell<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    forward: boolean;
    dragging: boolean;
    touch: boolean;
    edge: boolean;
    queued: boolean;
    link: boolean;
  } | null>(null);
  const nativePointers = cell(new Set<number>());
  const lastSwipe = cell(-Infinity);
  function dispose(s: Session, runQueue = false) {
    s.controller.abort();
    cancelAnimationFrame(s.frame);
    clearTimeout(s.timer);
    s.underlay?.remove();
    s.view?.dispose();
    const owned = current.current === s;
    if (owned) {
      delete s.surface.dataset.pageTurn;
      current.current = null;
      if (!runQueue) queued.current = null;
    }
    if (owned && runQueue && alive.current) {
      const q = queued.current;
      queued.current = null;
      if (q) navigate(q.forward, q.turn);
    }
  }
  function clear() {
    const s = current.current;
    queued.current = null;
    if (s) dispose(s);
    gesture.current = null;
  }
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  function allowed(forward: boolean) {
    const cfg = getOptions().interaction;
    return !cfg || (forward ? cfg.next : cfg.previous);
  }
  function begin(forward: boolean, corner = 1) {
    const surface = getSurface();
    if (
      current.current ||
      !surface ||
      !getOptions().enabled ||
      !allowed(forward)
    )
      return false;
    const controller = new AbortController();
    const s: Session = {
      surface,
      controller,
      distance: 0,
      vertical: 0,
      ending: false,
      applied: false,
      applying: false,
      finishing: false,
      motionless: reduced(),
      frame: 0,
      ready: Promise.resolve(),
    };
    current.current = s;
    if (s.motionless) return true;
    // A stalled range request leaves the current readable page in place.
    s.timer = setTimeout(() => dispose(s), 10_000);
    surface.dataset.pageTurn = "preparing";
    const pdfSurface = surface.classList.contains("pdf-spread");
    const view = (async () => {
      if (pdfSurface)
        await new Promise<void>((resolve) => {
          let frame = 0;
          const done = () => {
            cancelAnimationFrame(frame);
            clearTimeout(timer);
            controller.signal.removeEventListener("abort", done);
            resolve();
          };
          const check = () => {
            const busy = [
              ...surface.querySelectorAll(
                ":scope > .pdf-pages > .pdf-page canvas",
              ),
            ].some((c) => c.getAttribute("aria-busy") !== "false");
            if (!busy || controller.signal.aborted) done();
            else frame = requestAnimationFrame(check);
          };
          const timer = setTimeout(done, 5000);
          controller.signal.addEventListener("abort", done, { once: true });
          check();
        });
      if (controller.signal.aborted) return;
      const v = await paper(
        surface,
        capture(surface),
        forward,
        controller.signal,
        corner,
      );
      if (controller.signal.aborted) {
        v?.dispose();
        return;
      }
      s.view = v;
      v?.draw(s.distance, s.vertical);
    })();
    const destination = (async () => {
      let image: HTMLElement | undefined;
      const prepare = getOptions().prepare;
      if (prepare) image = await prepare(forward, controller.signal);
      else
        image = capture(
          surface,
          (forward ? -1 : 1) * (surface.clientWidth + 40),
        ).node;
      if (!image || controller.signal.aborted) return;
      image.classList.remove("reader-viewport", "pdf-spread");
      image.classList.add("curl-underlay");
      image.style.position = "absolute";
      image.style.inset = "0";
      image.style.margin = "0";
      image.style.width = surface.clientWidth + "px";
      image.style.height = surface.clientHeight + "px";
      image.inert = true;
      image.setAttribute("aria-hidden", "true");
      image.dataset.paperPdf = String(pdfSurface);
      if ((surface.dataset.paperSpread || surface.dataset.spread) === "2")
        image.style.clipPath = forward
          ? "inset(0 0 0 50%)"
          : "inset(0 50% 0 0)";
      surface.append(image);
      s.underlay = image;
      await view;
      if (!controller.signal.aborted) await s.view?.setDestination(image);
    })();
    s.ready = Promise.all([view, destination])
      .then(() => {
        clearTimeout(s.timer);
        if (!controller.signal.aborted) surface.dataset.pageTurn = "folding";
      })
      .catch(() => {
        // Keep the original page readable when preparing a turn fails.
        dispose(s);
      });
    return true;
  }
  function applyOnce(s: Session) {
    if (s.applied) return;
    s.applied = true;
    s.applying = true;
    try {
      s.apply?.();
    } finally {
      s.applying = false;
    }
  }
  async function finish(s: Session, commit: boolean) {
    if (current.current !== s || s.controller.signal.aborted) return;
    if (s.finishing) return;
    s.finishing = true;
    clearTimeout(s.timer);
    s.distance = commit ? 2 : 0;
    s.vertical = 0;
    s.view?.draw(s.distance, 0);
    if (commit) applyOnce(s);
    // Keep the fully painted destination over the native PDF canvases until
    // React has mounted and PDF.js has finished painting them. No blank spread.
    const start = performance.now();
    let frames = 0;
    const wait = () => {
      if (current.current !== s || s.controller.signal.aborted) return;
      const busy = [
        ...s.surface.querySelectorAll(":scope > .pdf-pages > .pdf-page canvas"),
      ].some((c) => c.getAttribute("aria-busy") !== "false");
      if ((!busy && frames++ >= 2) || performance.now() - start > 5000) {
        dispose(s, true);
        return;
      }
      s.timer = setTimeout(wait, 32);
    };
    if (commit) s.timer = setTimeout(wait, 32);
    else dispose(s, true);
  }
  async function end(commit: boolean, turn: () => void) {
    const s = current.current;
    if (!s) return;
    if (s.ending) return;
    s.ending = true;
    s.apply = turn;
    if (s.motionless) {
      if (commit) applyOnce(s);
      dispose(s, true);
      return;
    }
    if (commit) await s.ready;
    if (current.current !== s || s.controller.signal.aborted) return;
    const from = s.distance,
      to = commit ? 2 : 0,
      start = performance.now(),
      vertical = s.vertical;
    const duration = commit ? Math.max(280, (620 * (2 - from)) / 2) : 240;
    const tick = (now: number) => {
      if (current.current !== s) return;
      const t = Math.min(1, (now - start) / duration),
        ease = t * t * (3 - 2 * t);
      s.distance = from + (to - from) * ease;
      s.vertical = vertical * (1 - ease);
      s.view?.draw(s.distance, s.vertical);
      if (t < 1) s.frame = requestAnimationFrame(tick);
      else void finish(s, commit);
    };
    s.frame = requestAnimationFrame(tick);
    // Suspended WebKit frames must neither strand a layer nor lose navigation.
    s.timer = setTimeout(() => {
      void finish(s, commit);
    }, duration + 1400);
  }
  function navigate(forward: boolean, turn: () => void) {
    if (!allowed(forward)) return;
    if (!getOptions().enabled || reduced()) {
      turn();
      return;
    }
    if (current.current?.applying) {
      turn();
      return;
    }
    if (current.current) {
      if (!queued.current) queued.current = { forward, turn };
      return;
    }
    if (begin(forward)) void end(true, turn);
    else turn();
  }
  function connect() {
    alive.current = true;
    const surface = getSurface();
    if (!surface) return;
    let touchSequence = false;
    let touchBlocked = false;
    let touchId: number | undefined;
    let width = surface.clientWidth,
      height = surface.clientHeight;
    const observer = new ResizeObserver(() => {
      if (width !== surface.clientWidth || height !== surface.clientHeight) {
        width = surface.clientWidth;
        height = surface.clientHeight;
        clear();
      }
    });
    observer.observe(surface);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      if (media.matches) {
        const s = current.current;
        if (s?.ending && !s.applied) {
          applyOnce(s);
        }
        clear();
      }
    };
    media.addEventListener("change", motion);
    const visible = () => {
      if (document.hidden) {
        touchSequence = false;
        touchBlocked = false;
        touchId = undefined;
        nativePointers.current.clear();
        const s = current.current;
        if (s?.ending && !s.applied) {
          applyOnce(s);
        }
        clear();
      }
    };
    document.addEventListener("visibilitychange", visible);
    const visualViewport = window.visualViewport;
    const browserZoomed = () => (visualViewport?.scale || 1) > 1.01;
    const viewportChange = () => {
      const zoomed = browserZoomed();
      if ((surface.dataset.browserZoomed === "true") !== zoomed) {
        surface.dataset.browserZoomed = String(zoomed);
        clear();
        touchSequence = false;
        touchBlocked = false;
        touchId = undefined;
        nativePointers.current.clear();
      }
    };
    viewportChange();
    visualViewport?.addEventListener("resize", viewportChange);
    const down = (e: PointerEvent, fromTouch?: boolean) => {
      if (e.pointerType === "touch" && touchSequence && !fromTouch) return;
      nativePointers.current.add(e.pointerId);
      if (nativePointers.current.size > 1) {
        gesture.current = null;
        if (current.current && !current.current.ending)
          void end(false, () => {});
        return;
      }
      if (!surface.contains(e.target as Node)) return;
      const cfg = getOptions().interaction;
      if (
        !getOptions().enabled ||
        browserZoomed() ||
        !cfg ||
        cfg.blocked?.() ||
        e.button !== 0 ||
        !e.isPrimary ||
        (e.target as HTMLElement).closest(
          "button,input,textarea,select,[contenteditable=true]",
        ) ||
        (e.pointerType !== "touch" && (e.target as HTMLElement).closest("a"))
      )
        return;
      const rect = surface.getBoundingClientRect(),
        x = e.clientX - rect.left;
      // Leave the outer system-navigation edge alone. Mouse text selection is
      // unchanged; only mouse drags starting on a page edge become page turns.
      if (
        e.pointerType === "touch" &&
        (e.clientX < 16 || e.clientX > innerWidth - 16)
      )
        return;
      const f = x >= surface.clientWidth / 2,
        box = pageBox(surface, f),
        edge = f ? box.x + box.width : box.x;
      if (e.pointerType !== "touch" && Math.abs(x - edge) > 44) return;
      if (
        e.pointerType === "touch"
          ? !cfg.next && !cfg.previous
          : !(f ? cfg.next : cfg.previous)
      )
        return;
      gesture.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        width: box.width,
        height: box.height,
        forward: f,
        dragging: false,
        touch: e.pointerType === "touch",
        edge: Math.abs(x - edge) <= 28,
        queued: false,
        link: Boolean((e.target as HTMLElement).closest("a")),
      };
    };
    const move = (e: PointerEvent, fromTouch?: boolean) => {
      if (e.pointerType === "touch" && touchSequence && !fromTouch) return;
      const g = gesture.current;
      if (!g || g.id !== e.pointerId || nativePointers.current.size !== 1)
        return;
      const dx = e.clientX - g.x,
        dy = e.clientY - g.y,
        slop = g.touch ? 12 : 6;
      if (!g.dragging) {
        if (Math.abs(dx) < slop && Math.abs(dy) < slop) return;
        if (
          Math.abs(dy) > Math.abs(dx) * 1.2 ||
          (!g.touch && dx * (g.forward ? -1 : 1) < 0)
        ) {
          gesture.current = null;
          return;
        }
        if (g.touch) {
          g.forward = dx < 0;
          const cfg = getOptions().interaction;
          if (!(g.forward ? cfg?.next : cfg?.previous)) {
            gesture.current = null;
            return;
          }
          const box = pageBox(surface, g.forward);
          g.width = box.width;
          g.height = box.height;
        }
        const r = surface.getBoundingClientRect();
        g.queued = Boolean(g.touch && current.current?.ending);
        if (
          !g.queued &&
          !begin(g.forward, g.y - r.top < surface.clientHeight / 2 ? 0 : 1)
        ) {
          gesture.current = null;
          return;
        }
        g.dragging = true;
        if (g.touch) lastSwipe.current = performance.now();
        if (!fromTouch) {
          try {
            surface.setPointerCapture(e.pointerId);
          } catch {
            /* Window listeners retain a mouse/pen drag if capture is unavailable. */
          }
        }
      }
      e.preventDefault();
      const s = current.current;
      if (s && !s.ending && !g.queued) {
        s.distance = Math.max(
          0,
          Math.min(1.98, (dx * (g.forward ? -1 : 1)) / g.width),
        );
        s.vertical = dy / g.height;
        s.view?.draw(s.distance, s.vertical);
      }
    };
    const up = (e: PointerEvent, fromTouch?: boolean) => {
      if (e.pointerType === "touch" && touchSequence && !fromTouch) return;
      nativePointers.current.delete(e.pointerId);
      const g = gesture.current;
      if (!g || g.id !== e.pointerId) return;
      gesture.current = null;
      // A fast/coalesced contact may report only its terminal displacement.
      // Resolve it in this same owner rather than a second touch-end fallback.
      const releaseX = e.clientX - g.x,
        releaseY = e.clientY - g.y;
      if (
        !g.dragging &&
        g.touch &&
        Math.abs(releaseX) >= 60 &&
        Math.abs(releaseX) > Math.abs(releaseY) * 1.5
      ) {
        const forward = releaseX < 0;
        e.preventDefault();
        lastSwipe.current = performance.now();
        navigate(forward, () => getOptions().interaction?.step(forward));
        return;
      }
      if (g.dragging) {
        if (g.touch) e.preventDefault();
        if (reduced() && !current.current?.motionless) {
          clear();
          return;
        }
        // Interior swipes are distance based, independent of tablet page width.
        // Edge drags retain proportional release/cancel geometry like paper.
        const dx = e.clientX - g.x,
          dy = e.clientY - g.y;
        const commit =
          g.touch && !g.edge
            ? Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5
            : (g.queued
                ? (dx * (g.forward ? -1 : 1)) / g.width
                : current.current?.distance || 0) >= 0.35;
        if (g.queued) {
          if (commit)
            navigate(g.forward, () =>
              getOptions().interaction?.step(g.forward),
            );
        } else
          void end(commit, () => getOptions().interaction?.step(g.forward));
      } else if (
        !g.link &&
        g.edge &&
        Math.hypot(e.clientX - g.x, e.clientY - g.y) <= 12
      ) {
        if (g.touch) e.preventDefault();
        lastSwipe.current = performance.now();
        navigate(g.forward, () => getOptions().interaction?.step(g.forward));
      }
    };
    const cancel = (e: PointerEvent, fromTouch?: boolean) => {
      if (e.pointerType === "touch" && touchSequence && !fromTouch) return;
      nativePointers.current.delete(e.pointerId);
      const g = gesture.current;
      if (g?.id === e.pointerId) {
        gesture.current = null;
        if (g.dragging) void end(false, () => {});
      }
    };
    // Safari dispatches both event families. A native touch sequence takes sole
    // ownership so pointercancel/capture loss cannot suppress its touchend, and
    // React fallback swipes cannot turn the same page twice.
    const input = (touch: Touch, event: TouchEvent) =>
      ({
        pointerId: touch.identifier,
        pointerType: "touch",
        button: 0,
        isPrimary: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: event.target,
        preventDefault: () => {
          if (event.cancelable) event.preventDefault();
        },
      }) as PointerEvent;
    const abortTouch = () => {
      gesture.current = null;
      nativePointers.current.clear();
      if (current.current && !current.current.ending) void end(false, () => {});
    };
    const touchStart = (event: TouchEvent) => {
      if (!getOptions().enabled || browserZoomed()) {
        touchSequence = false;
        touchBlocked = false;
        touchId = undefined;
        nativePointers.current.clear();
        gesture.current = null;
        return;
      }
      if (event.touches.length !== 1 || touchBlocked) {
        touchSequence = true;
        touchBlocked = true;
        abortTouch();
        return;
      }
      // A fresh touchstart also releases an interrupted OS touch sequence.
      if (gesture.current && current.current && !current.current.ending)
        clear();
      touchSequence = true;
      touchId = event.touches[0].identifier;
      nativePointers.current.clear();
      down(input(event.touches[0], event), true);
    };
    const touchMove = (event: TouchEvent) => {
      if (!touchSequence || touchBlocked) return;
      if (event.touches.length !== 1) {
        touchBlocked = true;
        abortTouch();
        return;
      }
      const touch = Array.from(event.touches).find(
        (t) => t.identifier === touchId,
      );
      if (touch) move(input(touch, event), true);
    };
    const touchEnd = (event: TouchEvent) => {
      if (!touchSequence) return;
      const touch = Array.from(event.changedTouches).find(
        (t) => t.identifier === touchId,
      );
      if (!touchBlocked && touch) up(input(touch, event), true);
      if (!event.touches.length) {
        touchSequence = false;
        touchBlocked = false;
        touchId = undefined;
        nativePointers.current.clear();
      }
    };
    const touchCancel = (event: TouchEvent) => {
      if (!touchSequence) return;
      abortTouch();
      touchBlocked = event.touches.length > 0;
      touchSequence = touchBlocked;
      touchId = undefined;
    };
    surface.addEventListener("touchstart", touchStart, { passive: true });
    surface.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("touchend", touchEnd, { passive: false });
    window.addEventListener("touchcancel", touchCancel, { passive: true });
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    surface.addEventListener("lostpointercapture", cancel);
    return () => {
      alive.current = false;
      observer.disconnect();
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visible);
      visualViewport?.removeEventListener("resize", viewportChange);
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move);
      surface.removeEventListener("touchstart", touchStart);
      surface.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("touchcancel", touchCancel);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      surface.removeEventListener("lostpointercapture", cancel);
      nativePointers.current.clear();
      clear();
    };
  }
  const api = {
    begin,
    move(distance: number, vertical = 0) {
      const s = current.current;
      if (s && !s.ending) {
        s.distance = distance;
        s.vertical = vertical;
        s.view?.draw(distance, vertical);
      }
    },
    end,
    navigate,
    handledSwipe: () => performance.now() - lastSwipe.current < 1000,
  };
  return { api, connect, cancel: clear };
}

import { useLayoutEffect, useRef, type RefObject } from "react";

function snapshot(surface: HTMLElement) {
  const image = surface.cloneNode(true) as HTMLElement;
  image
    .querySelectorAll(".turn-leaf, .curl-underlay, .page-turn-controls")
    .forEach((n) => n.remove());
  surface.querySelectorAll("canvas").forEach((canvas, i) => {
    const target = image.querySelectorAll("canvas")[i];
    if (!target) return;
    target.width = canvas.width;
    target.height = canvas.height;
    target.style.cssText = canvas.style.cssText;
    target.getContext("2d")?.drawImage(canvas, 0, 0);
  });
  image
    .querySelectorAll(".reader-content")
    .forEach((n) => (n.className = "turn-content"));
  image.removeAttribute("id");
  image.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  return image;
}

// A short-lived cylindrical paper mesh. Each strip carries the actual outgoing
// text/canvas, with a different tangent: the page bends rather than rotating flat.
function paper(surface: HTMLElement, image: HTMLElement, forward: boolean) {
  const w = surface.clientWidth,
    h = surface.clientHeight;
  const facing = surface.dataset.spread === "2";
  const pw = facing ? w / 2 : w;
  const origin = forward ? (facing ? w / 2 : 0) : facing ? w / 2 : w;
  const leaf = document.createElement("div");
  leaf.className = "turn-leaf curl-mesh";
  leaf.setAttribute("aria-hidden", "true");
  leaf.inert = true;
  // Rasterize only the visible PDF viewport once. Each moving strip gets a
  // cropped slice, so its backing pixels sum to at most one screen-sized page.
  let raster: HTMLCanvasElement | undefined;
  if (surface.classList.contains("pdf-spread")) {
    raster = document.createElement("canvas");
    raster.width = w;
    raster.height = h;
    const ctx = raster.getContext("2d")!;
    ctx.fillStyle = getComputedStyle(surface).backgroundColor;
    ctx.fillRect(0, 0, w, h);
    const pages = [...image.querySelectorAll("canvas")];
    const widths = pages.map((c) => parseFloat(c.style.width) || c.width);
    const top = Math.max(
      20,
      (h -
        Math.max(...pages.map((c) => parseFloat(c.style.height) || c.height))) /
        2,
    );
    let left =
      (w -
        widths.reduce((sum, n) => sum + n, 0) -
        Math.max(0, pages.length - 1) * 12) /
      2;
    pages.forEach((canvas, i) => {
      ctx.drawImage(
        canvas,
        left,
        top - surface.scrollTop,
        widths[i],
        parseFloat(canvas.style.height) || canvas.height,
      );
      left += widths[i] + 12;
    });
  }
  const strips: HTMLElement[] = [];
  for (let i = 0; i < 12; i++) {
    const strip = document.createElement("div");
    strip.className = "curl-strip";
    strip.style.width = `${pw / 12 + 0.6}px`;
    strip.style.height = `${h}px`;
    const sourceX = forward
      ? origin + (i * pw) / 12
      : origin - ((i + 1) * pw) / 12;
    let face: HTMLElement;
    if (raster) {
      face = document.createElement("div");
      face.className = "curl-face pdf-turn-leaf";
      face.style.cssText = `position:absolute;inset:0;width:100%;height:100%;`;
      const crop = document.createElement("canvas");
      crop.width = Math.ceil(pw / 12 + 0.6);
      crop.height = h;
      crop.style.cssText = "width:100%;height:100%";
      crop
        .getContext("2d")!
        .drawImage(raster, sourceX, 0, crop.width, h, 0, 0, crop.width, h);
      face.append(crop);
    } else {
      face = image.cloneNode(true) as HTMLElement;
      face.className = "curl-face";
      face.style.cssText = `position:absolute;top:0;left:${-sourceX}px;width:${w}px;height:${h}px;max-width:none;margin:0;`;
    }
    strip.append(face);
    leaf.append(strip);
    strips.push(strip);
  }
  surface.append(leaf);
  return {
    leaf,
    draw(progress: number) {
      const bend = Math.sin(progress * Math.PI) * 1.25;
      const base = progress * Math.PI - bend / 2;
      let x = origin,
        z = 0;
      const sign = forward ? 1 : -1;
      strips.forEach((strip, i) => {
        const angle = base + (bend * (i + 0.5)) / 12;
        const dx = (Math.cos(angle) * pw) / 12;
        const dz = (Math.sin(angle) * pw) / 12;
        // Project each adjoining strip into one common camera, avoiding
        // independent CSS perspective origins (which produce visible seams).
        const depth = 2200,
          cx = w / 2,
          cy = h / 2;
        const x0 = forward ? x : x - dx;
        const z0 = forward ? z : z + dz;
        const dzdu = sign * Math.sin(angle);
        const denom = 1 - z0 / depth;
        const a = (Math.cos(angle) - (cx * dzdu) / depth) / denom;
        const lift = 0.18 * Math.sin(progress * Math.PI);
        const y0 = ((-(i + (forward ? 0 : 1)) * pw) / 12) * lift;
        const b = (-sign * lift - (cy * dzdu) / depth) / denom;
        const g = -dzdu / depth / denom;
        const e = (x0 - (cx * z0) / depth) / denom;
        const f = (y0 - (cy * z0) / depth) / denom;
        strip.style.transformOrigin = "0 0";
        strip.style.left = "0";
        strip.style.transform = `matrix3d(${a},${b},0,${g},0,${1 / denom},0,0,0,0,1,0,${e},${f},0,1)`;
        (strip.firstElementChild as HTMLElement).style.visibility =
          Math.cos(angle) < 0 ? "hidden" : "visible";
        strip.style.setProperty(
          "--shade",
          String(0.04 + Math.sin(angle) * 0.18),
        );
        x += sign * dx;
        z += dz;
      });
      leaf.style.opacity = String(progress > 0.92 ? (1 - progress) / 0.08 : 1);
    },
  };
}

export function usePageTurn(
  ref: RefObject<HTMLDivElement | null>,
  page: number,
  enabled = true,
  animatePage = true,
  prepare?: (
    forward: boolean,
    signal: AbortSignal,
  ) => Promise<HTMLElement | undefined>,
) {
  const state = useRef<ReturnType<typeof paper> | null>(null);
  const frame = useRef(0),
    value = useRef(0),
    skip = useRef(false);
  const previous = useRef<{
    page: number;
    width: number;
    height: number;
    image: HTMLElement;
    canvases: HTMLCanvasElement[];
  } | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const underlay = useRef<HTMLElement | null>(null);
  const preparing = useRef<AbortController | null>(null);
  function clear() {
    preparing.current?.abort();
    underlay.current?.remove();
    underlay.current = null;
    clearTimeout(deadline.current);
    cancelAnimationFrame(frame.current);
    state.current?.leaf.remove();
    state.current = null;
  }
  function animate(to: number, done?: () => void) {
    const from = value.current,
      start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 480);
      value.current = from + (to - from) * (1 - Math.pow(1 - t, 3));
      state.current?.draw(value.current);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else {
        clear();
        done?.();
      }
    };
    frame.current = requestAnimationFrame(tick);
    // WebKit can suspend animation frames while a PDF canvas is repainting or
    // a tab loses visibility. A visual layer must never outlive navigation.
    deadline.current = setTimeout(() => {
      clear();
      done?.();
    }, 900);
  }
  useLayoutEffect(() => {
    const surface = ref.current;
    if (!surface) return;
    const observer = new ResizeObserver(() => {
      if (state.current) clear();
    });
    observer.observe(surface);
    return () => {
      observer.disconnect();
      clear();
    };
  }, [ref]);
  useLayoutEffect(() => {
    const surface = ref.current;
    if (!surface) return;
    const old = previous.current;
    // Snapshot only changes in rendered page/layout, not every progress render.
    if (
      old?.page === page &&
      old.width === surface.clientWidth &&
      old.height === surface.clientHeight
    )
      return;
    const image = snapshot(surface);
    previous.current = {
      page,
      width: surface.clientWidth,
      height: surface.clientHeight,
      image,
      canvases: [
        ...surface.querySelectorAll<HTMLCanvasElement>(
          ":scope > .pdf-page canvas, :scope > .pdf-pages > .pdf-page canvas",
        ),
      ],
    };
    if (skip.current) {
      skip.current = false;
      return;
    }
    if (
      !enabled ||
      !animatePage ||
      !old ||
      old.page === page ||
      old.width !== surface.clientWidth ||
      old.height !== surface.clientHeight ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    clear();
    old.canvases.forEach((canvas, i) => {
      const target = old.image.querySelectorAll("canvas")[i];
      if (target) {
        target.width = canvas.width;
        target.height = canvas.height;
        target.style.cssText = canvas.style.cssText;
        target.getContext("2d")?.drawImage(canvas, 0, 0);
      }
    });
    value.current = 0;
    state.current = paper(surface, old.image, page > old.page);
    animate(1);
  });
  return {
    begin(forward: boolean) {
      clear();
      value.current = 0;
      if (
        !enabled ||
        !ref.current ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      state.current = paper(ref.current, snapshot(ref.current), forward);
      state.current.draw(0);
      const surface = ref.current;
      const controller = new AbortController();
      preparing.current = controller;
      const add = (image?: HTMLElement) => {
        if (!image || controller.signal.aborted || !state.current) return;
        image.className = "curl-underlay";
        image.inert = true;
        image.setAttribute("aria-hidden", "true");
        if (surface.dataset.spread === "2")
          image.style.clipPath = forward
            ? "inset(0 0 0 50%)"
            : "inset(0 50% 0 0)";
        surface.insertBefore(image, state.current.leaf);
        underlay.current = image;
      };
      if (prepare)
        void prepare(forward, controller.signal)
          .then(add)
          .catch(() => {});
      else {
        const image = snapshot(surface);
        const content = image.querySelector<HTMLElement>(".turn-content");
        if (content) {
          const x = Number(
            content.style.transform.match(/translateX\(([-\d.]+)px\)/)?.[1] ||
              0,
          );
          content.style.transform = `translateX(${x + (forward ? -1 : 1) * (surface.clientWidth + 40)}px)`;
          add(image);
        }
      }
    },
    move(progress: number) {
      value.current = progress;
      state.current?.draw(progress);
    },
    end(commit: boolean, turn: () => void) {
      preparing.current?.abort();
      if (!state.current) {
        if (commit) turn();
        return;
      }
      if (commit) {
        skip.current = true;
        turn();
      }
      animate(commit ? 1 : 0);
    },
  };
}

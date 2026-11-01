import {
  crease,
  bandMask,
  composeAffine,
  foldPlane,
  planeMatrix,
  verticalPlaneMatrix,
  type TurnAxis,
} from "./paper-fold";
import { articleSurface } from "./article-surface";
export type PageBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  hinge: number;
};
export type Capture = {
  node: HTMLElement;
  width: number;
  height: number;
  pdf: boolean;
  canvases: {
    canvas: HTMLCanvasElement;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
};
export function capture(surface: HTMLElement, offset = 0): Capture {
  const rect = surface.getBoundingClientRect(),
    pdf =
      surface.classList.contains("pdf-spread") ||
      surface.dataset.paperPdf === "true";
  const feed = surface.classList.contains("news-feed-surface");
  const node = feed
    ? (surface.cloneNode(false) as HTMLElement)
    : !pdf && surface.dataset.paperArticle !== "true"
      ? articleSurface(surface, offset)
      : (surface.cloneNode(true) as HTMLElement);
  // Print only the visible spread, never the hidden React preloads. Each
  // cylindrical band shares this bounded snapshot instead of cloning neighbors.
  if (feed) {
    const spread = surface.querySelector(":scope > .feed-spread");
    if (spread) node.append(spread.cloneNode(true));
  }
  node
    .querySelectorAll(
      ".turn-leaf,.curl-underlay,.page-turn-controls,.feed-edge",
    )
    .forEach((n) => n.remove());
  node
    .querySelectorAll(".reader-content")
    .forEach((n) => (n.className = "turn-content"));
  node.removeAttribute("id");
  node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  const canvases = [
    ...surface.querySelectorAll<HTMLCanvasElement>(
      ":scope > .pdf-pages > .pdf-page canvas, :scope > canvas",
    ),
  ].map((canvas) => {
    const r = canvas.getBoundingClientRect();
    return {
      canvas,
      x: r.left - rect.left,
      y: r.top - rect.top,
      width: r.width,
      height: r.height,
    };
  });
  return {
    node,
    width: surface.clientWidth,
    height: surface.clientHeight,
    pdf,
    canvases,
  };
}
export function pageBox(surface: HTMLElement, forward: boolean): PageBox {
  const w = surface.clientWidth,
    h = surface.clientHeight,
    facing = (surface.dataset.paperSpread || surface.dataset.spread) === "2";
  if (surface.classList.contains("pdf-spread")) {
    const r = surface.getBoundingClientRect(),
      canvases = [
        ...surface.querySelectorAll<HTMLCanvasElement>(
          ":scope > .pdf-pages > .pdf-page canvas",
        ),
      ];
    const c = (forward && facing ? canvases[1] : canvases[0]) || canvases[0];
    if (c) {
      const p = c.getBoundingClientRect();
      if (
        facing &&
        canvases.length === 1 &&
        surface.dataset.paperSpread === "2"
      ) {
        const width = p.width / 2,
          hinge = p.left - r.left + width;
        return {
          x: forward ? hinge : hinge - width,
          y: p.top - r.top,
          width,
          height: p.height,
          hinge,
        };
      }
      const width = p.width + (facing ? 6 : 0),
        hinge = facing ? w / 2 : forward ? p.left - r.left : p.right - r.left;
      return {
        x: forward ? hinge : hinge - width,
        y: p.top - r.top,
        width,
        height: p.height,
        hinge,
      };
    }
  }
  const width = facing ? w / 2 : w,
    hinge = facing ? w / 2 : forward ? 0 : w;
  return { x: forward ? hinge : hinge - width, y: 0, width, height: h, hinge };
}
async function raster(snapshot: Capture, box: PageBox, signal: AbortSignal) {
  const canvas = document.createElement("canvas");
  const density = Math.min(
    devicePixelRatio || 1,
    2,
    Math.sqrt(2_000_000 / (box.width * box.height)),
  );
  canvas.width = Math.max(1, Math.ceil(box.width * density));
  canvas.height = Math.max(1, Math.ceil(box.height * density));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(density, density);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, box.width, box.height);
  for (const p of snapshot.canvases)
    ctx.drawImage(p.canvas, p.x - box.x, p.y - box.y, p.width, p.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  canvas.width = canvas.height = 0;
  if (!blob || signal.aborted) return;
  const url = URL.createObjectURL(blob),
    img = new Image();
  img.src = url;
  try {
    await img.decode();
    if (signal.aborted) {
      URL.revokeObjectURL(url);
      return;
    }
    return { url, img };
  } catch {
    URL.revokeObjectURL(url);
  }
}
export async function paper(
  surface: HTMLElement,
  snapshot: Capture,
  forward: boolean,
  signal: AbortSignal,
  corner = 1,
  axis: TurnAxis = "horizontal",
) {
  const verticalTurn = axis === "vertical";
  const horizontalBox = pageBox(surface, forward);
  const box = verticalTurn
    ? {
        x: 0,
        y: horizontalBox.y,
        width: snapshot.width,
        height: horizontalBox.height,
        hinge: forward
          ? horizontalBox.y
          : horizontalBox.y + horizontalBox.height,
      }
    : horizontalBox;
  const w = snapshot.width,
    h = snapshot.height;
  const leaf = document.createElement("div");
  leaf.className = "turn-leaf paper-fold";
  leaf.setAttribute("aria-hidden", "true");
  leaf.inert = true;
  leaf.dataset.hinge = String(box.hinge);
  leaf.dataset.axis = axis;
  leaf.dataset.direction = forward ? "forward" : "backward";
  leaf.style.setProperty(
    "--sheet-color",
    snapshot.pdf
      ? "#fff"
      : getComputedStyle(surface).getPropertyValue("--paper"),
  );
  const front = snapshot.pdf ? await raster(snapshot, box, signal) : undefined;
  if (signal.aborted) {
    if (front) URL.revokeObjectURL(front.url);
    return;
  }
  if (snapshot.pdf && !front) throw new Error("Page image unavailable");
  const urls: string[] = front ? [front.url] : [];
  const bands: {
    el: HTMLElement;
    kind: "front" | "bend" | "back";
    index: number;
    back: boolean;
  }[] = [];
  let back:
    { snapshot: Capture; box: PageBox; image?: HTMLImageElement } | undefined;
  function face(isBack: boolean) {
    const holder = document.createElement("div");
    holder.className = "paper-texture";
    holder.style.cssText = `position:absolute;inset:0;width:${box.width}px;height:${box.height}px;overflow:hidden;`;
    const mirrored = isBack ? forward : !forward;
    holder.style.transformOrigin = "0 0";
    if (mirrored)
      holder.style.transform = verticalTurn
        ? "translateY(100%) scaleY(-1)"
        : "translateX(100%) scaleX(-1)";
    const data = isBack ? back?.snapshot : snapshot,
      region = isBack ? back?.box : box;
    const bitmap = isBack ? back?.image : front?.img;
    if (bitmap) {
      const img = bitmap.cloneNode() as HTMLImageElement;
      img.style.cssText =
        "display:block;width:100%;height:100%;max-width:none;margin:0";
      holder.append(img);
    } else if (data && !data.pdf && region) {
      const copy = data.node.cloneNode(true) as HTMLElement;
      copy.classList.remove("reader-viewport", "pdf-spread", "curl-underlay");
      copy.classList.add("paper-content");
      copy.style.cssText = `position:absolute;left:${-region.x}px;top:${-region.y}px;width:${data.width}px;height:${data.height}px;max-width:none;margin:0;overflow:hidden;`;
      holder.append(copy);
    }
    return holder;
  }
  for (let i = -1; i <= 12; i++) {
    const kind = i < 0 ? "front" : i === 12 ? "back" : "bend",
      isBack = i >= 6;
    const el = document.createElement("div");
    el.className = kind === "bend" ? "curl-strip paper-band" : "paper-flat";
    el.dataset.face = isBack ? "back" : "front";
    el.style.cssText = `position:absolute;left:0;top:0;width:1px;height:1px;transform-origin:0 0;`;
    const print = document.createElement("div");
    print.className = "paper-print";
    print.style.cssText = `width:${box.width}px;height:${box.height}px;`;
    print.append(face(isBack));
    el.append(print);
    const lighting = document.createElement("div");
    lighting.className = "paper-light";
    // Tangent angles depend only on band index, not turn progress. Keep these
    // variables on the empty lighting layer: changing inherited variables on
    // the band every frame invalidates every printed descendant in WebKit.
    const angle =
      kind === "bend" ? ((i + 0.5) * Math.PI) / 12 : isBack ? Math.PI : 0;
    lighting.style.setProperty(
      "--fold-shade",
      String(
        kind === "bend" ? 0.05 + Math.sin(angle) * 0.25 : isBack ? 0.035 : 0,
      ),
    );
    lighting.style.setProperty(
      "--fold-highlight",
      String(kind === "bend" ? Math.max(0, Math.sin(angle - 0.7)) * 0.16 : 0),
    );
    el.style.zIndex = String(10 + i);
    print.append(lighting);
    leaf.append(el);
    bands.push({ el, kind, index: i, back: isBack });
  }
  surface.append(leaf);
  let lastDistance = 0,
    lastVertical = 0;
  function draw(distance: number, vertical = 0) {
    lastDistance = distance;
    lastVertical = vertical;
    const foldWidth = verticalTurn ? box.height : box.width;
    const foldHeight = verticalTurn ? box.width : box.height;
    const f = crease(foldWidth, foldHeight, distance, vertical, corner),
      a = (Math.PI * f.radius) / 2;
    leaf.dataset.distance = String(distance);
    leaf.dataset.crease = JSON.stringify(f);
    for (const b of bands) {
      const low =
        b.kind === "front"
          ? -Infinity
          : b.kind === "back"
            ? a
            : -a + b.index * ((2 * a) / 12);
      const high =
        b.kind === "front"
          ? -a
          : b.kind === "back"
            ? Infinity
            : -a + (b.index + 1) * ((2 * a) / 12);
      // A rotated rectangular overflow mask represents the same crease band.
      // Polygon clip-path mutations repaint all printed regions in software
      // WebKit; keep the printed texture fixed and move cheap rectangular clips.
      const mask = bandMask(box.width, box.height, f, low, high, verticalTurn);
      const visibility = mask.visible ? "visible" : "hidden";
      if (b.el.style.visibility !== visibility)
        b.el.style.visibility = visibility;
      (b.el.firstElementChild as HTMLElement).style.transform = mask.inverse;
      const u =
        b.kind === "front" ? -a : b.kind === "back" ? a : (low + high) / 2;
      const plane = foldPlane(f, u, b.kind);
      b.el.style.transform = composeAffine(
        (verticalTurn ? verticalPlaneMatrix : planeMatrix)(
          plane,
          box.hinge,
          verticalTurn ? box.x : box.y,
          forward,
          w,
          h,
        ),
        mask.transform,
      );
    }
  }
  draw(0);
  return {
    leaf,
    draw,
    box,
    async setDestination(target: HTMLElement) {
      if (signal.aborted) return;
      const dest = capture(target),
        other = { ...box, x: forward ? box.hinge - box.width : box.hinge };
      // Single-page mode shows the next page underneath and an unprinted verso.
      if (
        verticalTurn ||
        (surface.dataset.paperSpread || surface.dataset.spread) !== "2"
      )
        return;
      const image = dest.pdf ? await raster(dest, other, signal) : undefined;
      if (signal.aborted) {
        if (image) URL.revokeObjectURL(image.url);
        return;
      }
      if (image) urls.push(image.url);
      back = { snapshot: dest, box: other, image: image?.img };
      for (const b of bands)
        if (b.back)
          b.el.querySelector(".paper-texture")?.replaceWith(face(true));
      draw(lastDistance, lastVertical);
    },
    dispose() {
      leaf.remove();
      for (const url of urls) URL.revokeObjectURL(url);
    },
  };
}

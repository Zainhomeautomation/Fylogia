import { useLayoutEffect, useRef, type RefObject } from "react";

function copyCanvas(source: HTMLCanvasElement, target?: HTMLCanvasElement) {
  if (!target) return;
  // PDF rendering completes asynchronously after the surface snapshot is made.
  target.width = source.width;
  target.height = source.height;
  target.style.cssText = source.style.cssText;
  target.getContext("2d")?.drawImage(source, 0, 0);
}

/** Animate the outgoing paper surface while the live, accessible page updates. */
export function usePageTurn(
  ref: RefObject<HTMLDivElement | null>,
  page: number,
  enabled = true,
) {
  const active = useRef<{ animation: Animation; leaf: HTMLElement } | null>(
    null,
  );
  useLayoutEffect(
    () => () => {
      active.current?.animation.cancel();
      active.current?.leaf.remove();
    },
    [],
  );
  const previous = useRef<{
    page: number;
    width: number;
    height: number;
    image: HTMLElement;
    canvases: HTMLCanvasElement[];
  } | null>(null);
  useLayoutEffect(() => {
    const surface = ref.current;
    if (!surface) return;
    const old = previous.current;
    if (
      old &&
      (old.width !== surface.clientWidth || old.height !== surface.clientHeight)
    ) {
      active.current?.animation.cancel();
      active.current?.leaf.remove();
    }
    const image = surface.cloneNode(true) as HTMLElement;
    image.querySelectorAll(".turn-leaf").forEach((node) => node.remove());
    surface.querySelectorAll("canvas").forEach((canvas, index) => {
      const copy = image.querySelectorAll("canvas")[index];
      copyCanvas(canvas, copy);
    });
    previous.current = {
      page,
      width: surface.clientWidth,
      height: surface.clientHeight,
      image,
      canvases: [
        ...surface.querySelectorAll<HTMLCanvasElement>(
          ":scope > .pdf-page canvas",
        ),
      ],
    };
    if (
      !enabled ||
      !old ||
      old.page === page ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    active.current?.animation.cancel();
    active.current?.leaf.remove();
    const leaf = old.image;
    old.canvases.forEach((canvas, index) => {
      copyCanvas(canvas, leaf.querySelectorAll("canvas")[index]);
    });
    leaf
      .querySelectorAll(".reader-content")
      .forEach((node) => (node.className = "turn-content"));
    leaf.className =
      "turn-leaf" +
      (surface.classList.contains("pdf-spread") ? " pdf-turn-leaf" : "");
    leaf.setAttribute("aria-hidden", "true");
    leaf.inert = true;
    leaf.removeAttribute("id");
    leaf.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    const forward = page > old.page;
    const facing = surface.dataset.spread === "2";
    if (facing) {
      leaf.style.clipPath = forward ? "inset(0 0 0 50%)" : "inset(0 50% 0 0)";
    }
    leaf.style.transformOrigin = facing
      ? "center center"
      : forward
        ? "left center"
        : "right center";
    surface.append(leaf);
    const animation = leaf.animate(
      [
        { transform: "perspective(1800px) rotateY(0deg)", opacity: 1 },
        {
          transform: `perspective(1800px) rotateY(${forward ? -78 : 78}deg)`,
          opacity: 1,
          offset: 0.85,
        },
        {
          transform: `perspective(1800px) rotateY(${forward ? -90 : 90}deg)`,
          opacity: 0,
        },
      ],
      {
        duration: 460,
        easing: "cubic-bezier(.22,.65,.25,1)",
        fill: "forwards",
      },
    );
    animation.onfinish = () => leaf.remove();
    active.current = { animation, leaf };
  });
}

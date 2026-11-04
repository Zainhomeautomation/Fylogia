import { useSyncExternalStore } from "react";

let nativeResizeAt = -1000;
export const nativeLayoutChanging = () =>
  performance.now() - nativeResizeAt < 250;
function snapshot() {
  return [
    Math.min(
      document.documentElement.clientWidth,
      window.visualViewport?.width || innerWidth,
    ),
    window.visualViewport?.height || innerHeight,
    Math.max(1, Number(document.documentElement.dataset.nativeTextScale || 1)),
    document.documentElement.dataset.nativeReadingMode === "scroll" ? 1 : 0,
  ].join(":");
}
function subscribe(notify: () => void) {
  const update = () => {
    nativeResizeAt = performance.now();
    notify();
  };
  const observer = new MutationObserver(update);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-native-text-scale"],
  });
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  const readingModeObserver = new MutationObserver(update);
  readingModeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-native-reading-mode"],
  });
  return () => {
    observer.disconnect();
    readingModeObserver.disconnect();
    window.removeEventListener("resize", update);
    window.visualViewport?.removeEventListener("resize", update);
  };
}
/** Actual usable geometry and Dynamic Type, shared across reflowable readers. */
export function useNativeWide(minimumPageWidth = 340) {
  const [width, height, scale, forcedScroll] = useSyncExternalStore(
    subscribe,
    snapshot,
  )
    .split(":")
    .map(Number);
  return (
    forcedScroll !== 1 &&
    width - 48 >= 2 * minimumPageWidth * scale &&
    width >= height * 0.9
  );
}
export function useNativeReadingScale() {
  return Number(useSyncExternalStore(subscribe, snapshot).split(":")[2]);
}

/** A paragraph/text location survives reflow more accurately than a page ratio. */
export function nativeTextAnchor(
  viewport: HTMLElement,
  content: HTMLElement,
): Range | null {
  const bounds = viewport.getBoundingClientRect();
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    if (
      [...range.getClientRects()].some(
        (r) =>
          r.bottom > bounds.top + 24 &&
          r.top < bounds.bottom &&
          r.left >= bounds.left - 1 &&
          r.left < bounds.right,
      )
    )
      return range;
  }
  return null;
}

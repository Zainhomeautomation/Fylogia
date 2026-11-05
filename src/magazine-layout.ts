/** Facing sheets require both readable page width and a wide or near-square viewport.
 * Container width decides readability; viewport orientation keeps tablets in
 * portrait comfortable without relying on device names or user-agent strings. */
export function magazineSpread(
  width: number,
  viewportWidth: number,
  viewportHeight: number,
  minimumPageWidth = 340,
): 1 | 2 {
  return width >= minimumPageWidth * 2 && viewportWidth >= viewportHeight * 0.9
    ? 2
    : 1;
}

/**
 * Wide, near-square viewports can keep facing pages legible. This adapts to
 * usable browser dimensions (including foldable inner displays) without
 * identifying a device model.
 */
export function wideReadingViewport(
  width: number,
  height: number,
  minimumWidth = 740,
): boolean {
  return width >= minimumWidth && width >= height * 0.9;
}

/**
 * Read the layout viewport used to lay out the page. iOS Safari may update
 * visualViewport asynchronously while its browser chrome and orientation are
 * changing; using that transient size for React layout decisions can leave the
 * feed in the wrong presentation until a later resize event.
 */
export function layoutViewport(): { width: number; height: number } {
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: document.documentElement.clientHeight || window.innerHeight,
  };
}

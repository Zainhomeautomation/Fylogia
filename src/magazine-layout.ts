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

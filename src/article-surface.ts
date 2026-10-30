// Animation-only projection of the existing layout. The accessible, complete
// article stays in Reader; invisible columns are never duplicated per band.
export function articleSurface(surface: HTMLElement, offset = 0) {
  const content = surface.querySelector<HTMLElement>(".reader-content")!;
  const bounds = surface.getBoundingClientRect();
  const width = surface.clientWidth,
    height = surface.clientHeight;
  const origin = content.getBoundingClientRect().left;
  const columns = Number(surface.dataset.spread) || 1;
  const stride = (width + 40) / columns;
  const node = document.createElement("div");
  node.className = "paginated";
  node.dataset.paperArticle = "true";
  node.dataset.snapshotOffset = String(offset);
  node.style.cssText = `width:${width}px;height:${height}px;overflow:hidden;position:relative`;
  const body = document.createElement("div");
  body.className = "turn-content";
  body.style.cssText =
    "position:absolute;inset:0;transform:none;will-change:auto";
  const ink = document.createElement("div");
  ink.className = "article-body";
  ink.style.cssText = "position:absolute;inset:0";
  body.append(ink);
  node.append(body);
  const visible = (r: DOMRect) =>
    r.height > 0 &&
    r.width > 0 &&
    r.right + offset > bounds.left &&
    r.left + offset < bounds.left + width &&
    r.bottom > bounds.top &&
    r.top < bounds.top + height;
  const column = (r: DOMRect) => Math.floor((r.left - origin + 0.5) / stride);
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    if (!text.data.trim()) continue;
    range.selectNodeContents(text);
    const rects = [...range.getClientRects()];
    const shown = rects.filter(visible);
    if (!shown.length) continue;
    const style = getComputedStyle(text.parentElement!);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const pre =
      style.whiteSpace.startsWith("pre") || style.whiteSpace === "break-spaces";
    const at = (i: number) => {
      range.setStart(text, i);
      range.setEnd(text, Math.min(text.length, i + 1));
      return range.getBoundingClientRect();
    };
    const boundary = (target: DOMRect, after: boolean) => {
      let low = 0,
        high = text.length;
      const col = column(target);
      while (low < high) {
        const mid = (low + high) >>> 1,
          r = at(mid),
          c = column(r);
        const before =
          c < col ||
          (c === col &&
            (after ? r.top <= target.top + 0.5 : r.top < target.top - 0.5));
        if (before) low = mid + 1;
        else high = mid;
      }
      return low;
    };
    for (const rect of shown) {
      let first = rects.length === 1 ? 0 : boundary(rect, false);
      let last = rects.length === 1 ? text.length : boundary(rect, true);
      if (!pre) {
        while (first < last && /[\t\n\r\f ]/.test(text.data[first])) first++;
        while (last > first && /[\t\n\r\f ]/.test(text.data[last - 1])) last--;
      }
      if (first >= last) continue;
      const start = at(first);
      const line = document.createElement("span");
      const value = text.data.slice(first, last);
      line.textContent = pre ? value : value.replace(/[\t\n\r\f ]+/g, " ");
      // Match the glyph rectangle and computed inline typography, including
      // linked/emphasized fragments and publisher captions.
      line.style.cssText = `position:absolute;left:${start.left - bounds.left + offset}px;top:${rect.top - bounds.top}px;white-space:pre;margin:0;padding:0;max-width:none;line-height:${rect.height}px`;
      for (const key of [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "fontStretch",
        "fontVariant",
        "letterSpacing",
        "wordSpacing",
        "color",
        "textDecorationLine",
        "textDecorationColor",
        "textDecorationStyle",
        "textTransform",
      ] as const)
        line.style[key] = style[key];
      ink.append(line);
    }
  }
  for (const original of content.querySelectorAll<HTMLImageElement>("img")) {
    const r = original.getBoundingClientRect();
    if (!visible(r)) continue;
    const image = original.cloneNode() as HTMLImageElement;
    const style = getComputedStyle(original);
    image.removeAttribute("id");
    image.loading = "eager";
    image.removeAttribute("srcset");
    image.src = original.currentSrc || original.src;
    image.style.cssText = `position:absolute;left:${r.left - bounds.left + offset}px;top:${r.top - bounds.top}px;width:${r.width}px;height:${r.height}px;max-width:none;max-height:none;margin:0;object-fit:${style.objectFit};border-radius:${style.borderRadius}`;
    ink.append(image);
  }
  return node;
}

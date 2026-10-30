import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
// Four adjacent page bitmaps at most, independent of a magazine's page count.
// Pending renders are cancellable; the current native PDF canvases stay separate.
export function pdfTurnCache(
  pdf: PDFDocumentProxy,
  width: number,
  maxHeight: number,
) {
  const entries = new Map<
    number,
    { promise: Promise<HTMLCanvasElement>; cancel: () => void }
  >();
  let closed = false;
  const get = (num: number) => {
    const existing = entries.get(num);
    if (existing) {
      entries.delete(num);
      entries.set(num, existing);
      return existing.promise;
    }
    let cancelled = false,
      task: RenderTask | undefined,
      canvas: HTMLCanvasElement | undefined;
    const entry = {
      cancel() {
        cancelled = true;
        task?.cancel();
        if (canvas) canvas.width = canvas.height = 0;
      },
      promise: Promise.resolve(null as unknown as HTMLCanvasElement),
    };
    entry.promise = (async () => {
      const page = await pdf.getPage(num);
      if (cancelled || closed)
        throw new DOMException("Page preparation cancelled", "AbortError");
      const base = page.getViewport({ scale: 1 }),
        displayWidth = Math.min(width, (maxHeight * base.width) / base.height),
        displayHeight = (displayWidth * base.height) / base.width;
      const density = Math.min(
        devicePixelRatio || 1,
        2,
        Math.sqrt(2_000_000 / (displayWidth * displayHeight)),
      );
      const viewport = page.getViewport({
        scale: (displayWidth / base.width) * density,
      });
      canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = `width:${displayWidth}px;height:${displayHeight}px;flex-shrink:0`;
      canvas.setAttribute("aria-busy", "true");
      task = page.render({ canvas, viewport });
      await task.promise;
      if (cancelled || closed)
        throw new DOMException("Page preparation cancelled", "AbortError");
      canvas.setAttribute("aria-busy", "false");
      return canvas;
    })().catch((e) => {
      if (entries.get(num) === entry) entries.delete(num);
      throw e;
    });
    entries.set(num, entry);
    while (entries.size > 4) {
      const key = entries.keys().next().value!;
      entries.get(key)!.cancel();
      entries.delete(key);
    }
    return entry.promise;
  };
  return {
    get,
    dispose() {
      closed = true;
      for (const entry of entries.values()) entry.cancel();
      entries.clear();
    },
    get size() {
      return entries.size;
    },
  };
}

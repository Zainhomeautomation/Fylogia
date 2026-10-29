import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
// Private PDF thumbnails are rendered locally and never sent to a server.
export async function renderPdfCover(pdf: pdfjs.PDFDocumentProxy) {
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({
    scale: 600 / Math.max(base.width, base.height),
  });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  const result = canvas.toDataURL("image/webp", 0.85);
  canvas.width = canvas.height = 0;
  return result;
}
export async function createPdfCover(data: ArrayBuffer) {
  const task = pdfjs.getDocument({
    data: new Uint8Array(data.slice(0)),
    wasmUrl: `${import.meta.env.BASE_URL}pdfjs/${pdfjs.version}/`,
  });
  try {
    return await renderPdfCover(await task.promise);
  } finally {
    await task.destroy();
  }
}

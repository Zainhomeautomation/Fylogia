import { BrandHome } from "./BrandHome";
import { BrandMark } from "./BrandMark";
import { getLibraryValue, setLibraryValue } from "./local-library";
import type { LibraryData } from "./library-data";
import { PageTurnControls } from "./PageTurnControls";
import { useReaderReturn } from "./useReaderReturn";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { pdfTurnCache } from "./pdf-turn-cache";
import { usePageTurn } from "./usePageTurn";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  ArrowLeft,
  House,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bookmark,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Scan,
} from "lucide-react";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
// Retain one online edition for this tab so reopening a large magazine does
// not repeat its download. Local files are released when the reader closes.
let retainedEdition:
  | { url: string; task: pdfjs.PDFDocumentLoadingTask; loaded: boolean }
  | undefined;
function Canvas({
  pdf,
  num,
  width,
  maxHeight,
}: {
  pdf: pdfjs.PDFDocumentProxy;
  num: number;
  width: number;
  maxHeight: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let task: pdfjs.RenderTask | undefined;
    pdf
      .getPage(num)
      .then((page) => {
        if (cancelled || !ref.current) return;
        const base = page.getViewport({ scale: 1 });
        const displayWidth = Math.min(
          width,
          (maxHeight * base.width) / base.height,
        );
        const displayHeight = (displayWidth * base.height) / base.width;
        const density = Math.min(
          devicePixelRatio,
          2,
          Math.sqrt(5_000_000 / (displayWidth * displayHeight)),
        );
        const viewport = page.getViewport({
          scale: (displayWidth / base.width) * density,
        });
        const canvas = ref.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = displayWidth + "px";
        canvas.style.height = displayHeight + "px";
        canvas.setAttribute("aria-busy", "true");
        task = page.render({ canvas, viewport });
        task.promise
          .then(() => {
            if (!cancelled) canvas.setAttribute("aria-busy", "false");
          })
          .catch((e) => {
            if (!cancelled) setError(String(e));
          });
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, num, width, maxHeight]);
  return (
    <div className="pdf-page">
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <canvas
          ref={ref}
          aria-busy="true"
          aria-label={`Magazine page ${num}`}
        />
      )}
    </div>
  );
}
export default function PdfReader({
  id,
  url,
  title,
  onClose,
  onHome,
  onCover,
}: {
  id: string;
  url: string;
  title: string;
  onClose: () => void;
  onHome: () => void;
  onCover?: (cover: string) => void;
}) {
  const goHome = useReaderReturn(onHome);
  const publicMagazine = !url.startsWith("blob:");
  const [sharedOpening] = useState(() =>
    publicMagazine
      ? getLibraryValue<LibraryData["magazineReading"]>("magazineReading", {})[
          id
        ]
      : undefined,
  );
  const coverCallback = useRef(onCover);
  useEffect(() => {
    coverCallback.current = onCover;
  }, [onCover]);
  const [immersive, setImmersive] = useState(false);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy>(),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [size, setSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight - 180,
    }),
    [ratio, setRatio] = useState(1.3),
    [zoom, setZoom] = useState(1),
    [bookmarkPage, setBookmarkPage] = useState(() => {
      try {
        return (
          sharedOpening?.bookmark ??
          (Number(localStorage.getItem("folio.v1.pdf." + title)) || 0)
        );
      } catch {
        return 0;
      }
    });
  const bookmarked = bookmarkPage === page;
  const surface = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const spread =
    size.width >= 740 && ratio >= 0.85 && (size.height - 40) / ratio >= 280
      ? 2
      : 1;
  const pageWidth = Math.max(
    1,
    Math.min((size.width - 36) / spread, (size.height - 40) / ratio, 900),
  );
  const zoomRef = useRef(1);
  const pinching = useRef(false);
  const lastTap = useRef(0);
  const touchZoomed = useRef(0);
  const progressKey = "fylogia.pdf.progress." + id;
  const pageValue = useRef(page);
  useLayoutEffect(() => {
    pageValue.current = page;
  }, [page]);
  const changeZoom = useCallback((value: number) => {
    const next = Math.max(1, Math.min(4, value));
    zoomRef.current = next;
    setZoom(next);
  }, []);
  const applyPage = useCallback(
    (value: number | ((previous: number) => number)) => {
      const next = Math.max(
        1,
        Math.min(
          pdf?.numPages || 1,
          typeof value === "function" ? value(pageValue.current) : value,
        ),
      );
      pageValue.current = next;
      setPage(next);
      changeZoom(1);
      if (surface.current) {
        surface.current.scrollTop = 0;
        surface.current.scrollLeft = 0;
      }
    },
    [changeZoom, pdf?.numPages],
  );
  const pageCache = useRef<ReturnType<typeof pdfTurnCache> | null>(null);
  useEffect(() => {
    if (!pdf) return;
    const cache = pdfTurnCache(pdf, pageWidth, size.height - 40);
    pageCache.current = cache;
    return () => {
      cache.dispose();
      if (pageCache.current === cache) pageCache.current = null;
    };
  }, [pdf, pageWidth, size.height]);
  useEffect(() => {
    if (!pdf || zoom !== 1) return;
    const timer = window.setTimeout(() => {
      const target = page + spread;
      for (let i = target; i < Math.min(target + spread, pdf.numPages + 1); i++)
        void pageCache.current?.get(i).catch(() => {});
    }, 180);
    return () => clearTimeout(timer);
  }, [pdf, page, spread, pageWidth, size.height, zoom]);
  const curl = usePageTurn(
    surface,
    page,
    zoom === 1,
    async (forward, signal) => {
      if (!pdf || !pageCache.current) return;
      const target = page + (forward ? spread : -spread);
      if (target < 1 || target > pdf.numPages) return;
      const canvases = await Promise.all(
        Array.from(
          { length: Math.min(spread, pdf.numPages - target + 1) },
          (_, i) => pageCache.current!.get(target + i),
        ),
      );
      if (signal.aborted) return;
      const wrapper = document.createElement("div");
      wrapper.style.cssText =
        "display:flex;justify-content:center;align-items:center;padding:20px 12px";
      const sheets = document.createElement("div");
      sheets.className = "pdf-pages";
      sheets.style.width = pageWidth * spread + 12 * (spread - 1) + "px";
      for (const canvas of canvases) {
        const sheet = document.createElement("div");
        sheet.className = "pdf-page";
        sheet.append(canvas);
        sheets.append(sheet);
      }
      wrapper.append(sheets);
      return wrapper;
    },
    {
      previous: page > 1,
      next: Boolean(pdf && page + spread <= pdf.numPages),
      blocked: () => pinching.current || zoomRef.current !== 1,
      step: (forward) =>
        applyPage((p) =>
          Math.max(
            1,
            Math.min(pdf?.numPages || 1, p + (forward ? spread : -spread)),
          ),
        ),
    },
  );
  const turn = useCallback(
    (value: number | ((previous: number) => number)) => {
      const next =
        typeof value === "function" ? value(pageValue.current) : value;
      if (next === pageValue.current) return;
      curl.navigate(next > pageValue.current, () => applyPage(value));
    },
    [applyPage, curl],
  );
  useEffect(() => {
    if (!pdf || !coverCallback.current) return;
    let active = true;
    void import("./pdf-cover")
      .then((m) => m.renderPdfCover(pdf))
      .then((cover) => {
        if (active) coverCallback.current?.(cover);
      })
      .catch(() => {
        /* A missing cover never prevents reading. */
      });
    return () => {
      active = false;
    };
  }, [pdf]);
  // Keep existing magazine page bookmarks across the rebrand.
  const key = "folio.v1.pdf." + title;
  useEffect(() => {
    let saved = 1;
    try {
      saved =
        Number(
          localStorage.getItem(progressKey) || localStorage.getItem(key),
        ) || 1;
    } catch {}
    saved = sharedOpening?.page || saved;
    let active = true;
    const local = url.startsWith("blob:");
    if (!local && retainedEdition && retainedEdition.url !== url) {
      void retainedEdition.task.destroy();
      retainedEdition = undefined;
    }
    const entry = (!local && retainedEdition) || {
      url,
      task: pdfjs.getDocument({
        url,
        wasmUrl: `${import.meta.env.BASE_URL}pdfjs/${pdfjs.version}/`,
      }),
      loaded: false,
    };
    if (!local) retainedEdition = entry;
    const { task } = entry;
    task.promise
      .then((p) => {
        entry.loaded = true;
        if (!active) return;
        setPdf(p);
        void p.getPage(1).then((first) => {
          if (!active) return;
          const dimensions = first.getViewport({ scale: 1 });
          setRatio(dimensions.height / dimensions.width);
        });
        setPage(Math.min(saved, p.numPages));
      })
      .catch(() => {
        if (active)
          setError(
            "This PDF could not be loaded. Open the original publication or try again with a connection.",
          );
        if (retainedEdition === entry) retainedEdition = undefined;
      });
    return () => {
      active = false;
      if (local || !entry.loaded) {
        void task.destroy();
        if (retainedEdition === entry) retainedEdition = undefined;
      }
    };
  }, [url, key, progressKey, sharedOpening]);
  useEffect(() => {
    if (pdf) {
      if (publicMagazine)
        setLibraryValue<LibraryData["magazineReading"]>(
          "magazineReading",
          (old) => {
            const previous = old[id] || { page: 1, bookmark: bookmarkPage };
            return old[id] && previous.page === page
              ? old
              : { ...old, [id]: { ...previous, page } };
          },
        );
      try {
        localStorage.setItem(progressKey, String(page));
      } catch {
        /* Reading remains available if storage is full. */
      }
    }
  }, [page, pdf, progressKey, id, publicMagazine, bookmarkPage]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const resize = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight")
        turn((p) => Math.min(pdf?.numPages || 1, p + spread));
      if (e.key === "ArrowLeft") turn((p) => Math.max(1, p - spread));
    };
    window.addEventListener("keydown", esc);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = previous;
    };
  }, [pdf, spread, onClose, turn]);
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    let initial: {
      distance: number;
      zoom: number;
      value: number;
      x: number;
      y: number;
      viewX: number;
      viewY: number;
    } | null = null;
    let frame = 0;
    const distance = (e: TouchEvent) =>
      Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    const begin = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinching.current = true;
      touch.current = null;
      const sheet = element.querySelector<HTMLElement>(".pdf-pages");
      if (!sheet) return;
      const rect = sheet.getBoundingClientRect(),
        area = element.getBoundingClientRect();
      const x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      initial = {
        distance: distance(e),
        zoom: zoomRef.current,
        value: zoomRef.current,
        x: (x - rect.left) / Math.max(1, rect.width),
        y: (y - rect.top) / Math.max(1, rect.height),
        viewX: x - area.left,
        viewY: y - area.top,
      };
      sheet.style.transformOrigin = `${x - rect.left}px ${y - rect.top}px`;
    };
    const move = (e: TouchEvent) => {
      if (!initial || e.touches.length !== 2) return;
      e.preventDefault();
      initial.value = Math.max(
        1,
        Math.min(
          4,
          (initial.zoom * distance(e)) / Math.max(1, initial.distance),
        ),
      );
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!initial) return;
        const sheet = element.querySelector<HTMLElement>(".pdf-pages");
        if (sheet)
          sheet.style.transform = `scale(${initial.value / initial.zoom})`;
        element.dataset.pinchZoom = String(initial.value);
      });
    };
    const end = (e: TouchEvent) => {
      if (e.touches.length === 0) pinching.current = false;
      if (e.touches.length >= 2 || !initial) return;
      const completed = initial;
      initial = null;
      cancelAnimationFrame(frame);
      const sheet = element.querySelector<HTMLElement>(".pdf-pages");
      if (sheet) {
        sheet.style.transform = "";
        sheet.style.transformOrigin = "";
      }
      delete element.dataset.pinchZoom;
      if (e.type === "touchcancel") return;
      // Re-render at the final resolution once; gesture frames only transform
      // the existing canvas, avoiding repeated PDF decoding on mobile Safari.
      changeZoom(completed.value);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!sheet) return;
          element.scrollLeft =
            sheet.offsetLeft +
            completed.x * sheet.offsetWidth -
            completed.viewX;
          element.scrollTop =
            sheet.offsetTop +
            completed.y * sheet.offsetHeight -
            completed.viewY;
        });
      });
    };
    element.addEventListener("touchstart", begin, { passive: true });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end, { passive: true });
    element.addEventListener("touchcancel", end, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("touchstart", begin);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", end);
    };
  }, [changeZoom]);
  return (
    <div
      className={`reader pdf-reader ${immersive ? "immersive" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="reader-toolbar">
        <div className="reader-navigation">
          <button
            autoFocus
            className="icon-button"
            aria-label="Back to previous section"
            title="Back to previous section (Escape)"
            onClick={onClose}
          >
            <ArrowLeft />
          </button>
          <button
            className="icon-button"
            aria-label="Home — For You"
            title="Home — For You"
            onClick={goHome}
          >
            <House />
          </button>
        </div>
        <BrandHome className="reader-brand-home" onHome={goHome}>
          <BrandMark />
          <span className="wordmark">Fylogia</span>
        </BrandHome>
        <strong>{title}</strong>
        <button
          className="icon-button focus-toggle"
          aria-label={
            immersive ? "Exit immersive reading" : "Enter immersive reading"
          }
          aria-pressed={immersive}
          onClick={() => setImmersive(!immersive)}
        >
          {immersive ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <button
          className="secondary pdf-bookmark-button"
          aria-label="Bookmark page"
          title="Bookmark page"
          aria-pressed={bookmarked}
          onClick={() => {
            try {
              localStorage.setItem(key, String(page));
              setBookmarkPage(page);
              if (publicMagazine)
                setLibraryValue<LibraryData["magazineReading"]>(
                  "magazineReading",
                  (old) => ({
                    ...old,
                    [id]: { page: old[id]?.page || page, bookmark: page },
                  }),
                );
            } catch {
              setError(
                "Could not save this bookmark. Browser storage is full.",
              );
            }
          }}
        >
          <Bookmark size={17} />
          Bookmark page
        </button>
        {!url.startsWith("blob:") && (
          <a
            className="icon-button"
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open original PDF"
          >
            <ExternalLink size={18} />
          </a>
        )}
      </header>
      <div
        className="pdf-zoom-controls"
        role="group"
        aria-label="Magazine zoom"
      >
        <button
          className="icon-button"
          aria-label="Zoom out"
          disabled={zoom <= 1}
          onClick={() => changeZoom(zoom - 0.5)}
        >
          <ZoomOut size={18} />
        </button>
        <button
          className="text-button"
          aria-label="Fit magazine pages"
          title="Fit magazine pages"
          onClick={() => changeZoom(1)}
        >
          <Scan size={16} /> {Math.round(zoom * 100)}%
        </button>
        <button
          className="icon-button"
          aria-label="Zoom in"
          disabled={zoom >= 4}
          onClick={() => changeZoom(zoom + 0.5)}
        >
          <ZoomIn size={18} />
        </button>
        <span>
          {zoom > 1
            ? "Drag to explore · Fit to turn"
            : "Double-tap or pinch to zoom"}
        </span>
      </div>
      <div
        className="pdf-spread"
        data-spread={spread}
        data-paper-spread={
          spread === 2 ||
          (id === "nasa-spinoff-2025" &&
            ratio < 0.85 &&
            pageWidth >= 680 &&
            zoom === 1)
            ? 2
            : 1
        }
        ref={surface}
        data-zoom={zoom}
        onDoubleClick={(e) => {
          const canvas = (e.target as HTMLElement).closest("canvas");
          const bounds = canvas?.getBoundingClientRect();
          if (
            bounds &&
            (e.clientX - bounds.left < 28 || bounds.right - e.clientX < 28)
          )
            return;
          if (
            performance.now() - touchZoomed.current > 700 &&
            (e.target as HTMLElement).closest("canvas")
          )
            changeZoom(zoom > 1 ? 1 : 2);
        }}
        onTouchStart={(e) => {
          if (e.touches.length !== 1) {
            touch.current = null;
            return;
          }
          pinching.current = false;
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start || !pdf || pinching.current || e.touches.length) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (
            Math.hypot(dx, dy) < 12 &&
            (e.target as HTMLElement).closest("canvas")
          ) {
            const bounds = (e.target as HTMLElement).getBoundingClientRect();
            const x = e.changedTouches[0].clientX;
            if (x - bounds.left < 28 || bounds.right - x < 28) {
              lastTap.current = 0;
              return;
            }
            const now = performance.now();
            if (now - lastTap.current < 300) {
              touchZoomed.current = now;
              changeZoom(zoom > 1 ? 1 : 2);
              lastTap.current = 0;
            } else lastTap.current = now;
          }
        }}
      >
        {error ? (
          <p role="alert">{error}</p>
        ) : pdf ? (
          <>
            <div
              className="pdf-pages"
              style={{
                width: pageWidth * zoom * spread + 12 * (spread - 1),
              }}
            >
              {Array.from(
                { length: Math.min(spread, pdf.numPages - page + 1) },
                (_, i) => (
                  <Canvas
                    key={page + i}
                    pdf={pdf}
                    num={page + i}
                    width={pageWidth * zoom}
                    maxHeight={(size.height - 40) * zoom}
                  />
                ),
              )}
            </div>
          </>
        ) : (
          <p role="status">Loading original publication…</p>
        )}
      </div>
      {pdf && pdf.numPages > spread && zoom === 1 && (
        <PageTurnControls
          curl={curl}
          previous={
            page > 1 ? () => turn((p) => Math.max(1, p - spread)) : undefined
          }
          next={
            page + spread <= pdf.numPages
              ? () => turn((p) => p + spread)
              : undefined
          }
        />
      )}
      <footer className="reader-footer">
        <button
          className="secondary"
          aria-label="Previous magazine page"
          disabled={page === 1 || !pdf}
          onClick={() => {
            turn((p) => Math.max(1, p - spread));
          }}
        >
          <ChevronLeft />
          Previous
        </button>
        <span role="status">
          Page {page}
          {spread === 2 && pdf && page < pdf.numPages
            ? `–${page + 1}`
            : ""} of {pdf?.numPages || "…"}
        </span>
        <button
          className="secondary"
          aria-label="Next magazine page"
          disabled={!pdf || page + spread > pdf.numPages}
          onClick={() => {
            turn((p) => p + spread);
          }}
        >
          Next
          <ChevronRight />
        </button>
      </footer>
    </div>
  );
}

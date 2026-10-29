import { useEffect, useRef, useState } from "react";
import { usePageTurn } from "./usePageTurn";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bookmark,
  Maximize2,
  Minimize2,
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
}: {
  pdf: pdfjs.PDFDocumentProxy;
  num: number;
  width: number;
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
        const scale = width / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({
          scale: scale * Math.min(devicePixelRatio, 2),
        });
        const canvas = ref.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = width + "px";
        canvas.style.height =
          viewport.height / Math.min(devicePixelRatio, 2) + "px";
        task = page.render({ canvas, viewport });
        task.promise.catch((e) => {
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
  }, [pdf, num, width]);
  return (
    <div className="pdf-page">
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <canvas ref={ref} aria-label={`Magazine page ${num}`} />
      )}
    </div>
  );
}
export default function PdfReader({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [immersive, setImmersive] = useState(false);
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy>(),
    [error, setError] = useState(""),
    [page, setPage] = useState(1),
    [width, setWidth] = useState(window.innerWidth),
    [bookmarked, setBookmarked] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  usePageTurn(surface, page);
  const spread = width >= 740 ? 2 : 1;
  // Keep existing magazine page bookmarks across the rebrand.
  const key = "folio.v1.pdf." + title;
  useEffect(() => {
    let saved = 1;
    try {
      saved = Number(localStorage.getItem(key)) || 1;
    } catch {}
    let active = true;
    const local = url.startsWith("blob:");
    if (!local && retainedEdition && retainedEdition.url !== url) {
      void retainedEdition.task.destroy();
      retainedEdition = undefined;
    }
    const entry = (!local && retainedEdition) || {
      url,
      task: pdfjs.getDocument({ url }),
      loaded: false,
    };
    if (!local) retainedEdition = entry;
    const { task } = entry;
    task.promise
      .then((p) => {
        entry.loaded = true;
        if (!active) return;
        setPdf(p);
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
  }, [url, key]);
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight")
        setPage((p) => Math.min(pdf?.numPages || 1, p + spread));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(1, p - spread));
    };
    window.addEventListener("keydown", esc);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = previous;
    };
  }, [pdf, spread, onClose]);
  return (
    <div
      className={`reader pdf-reader ${immersive ? "immersive" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="reader-toolbar">
        <button
          autoFocus
          className="icon-button"
          onClick={onClose}
          aria-label="Close magazine"
        >
          <X />
        </button>
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
          className="secondary"
          aria-pressed={bookmarked}
          onClick={() => {
            try {
              localStorage.setItem(key, String(page));
              setBookmarked(true);
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
        className="pdf-spread"
        data-spread={spread}
        ref={surface}
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start || !pdf) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
            setPage((p) =>
              Math.max(
                1,
                Math.min(pdf.numPages, p + (dx < 0 ? spread : -spread)),
              ),
            );
        }}
      >
        {error ? (
          <p role="alert">{error}</p>
        ) : pdf ? (
          <>
            {Array.from(
              { length: Math.min(spread, pdf.numPages - page + 1) },
              (_, i) => (
                <Canvas
                  key={page + i}
                  pdf={pdf}
                  num={page + i}
                  width={Math.min((width - 50) / spread, 650)}
                />
              ),
            )}
          </>
        ) : (
          <p role="status">Loading original publication…</p>
        )}
      </div>
      <footer className="reader-footer">
        <button
          className="secondary"
          aria-label="Previous magazine page"
          disabled={page === 1 || !pdf}
          onClick={() => {
            setPage((p) => Math.max(1, p - spread));
            setBookmarked(false);
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
            setPage((p) => p + spread);
            setBookmarked(false);
          }}
        >
          Next
          <ChevronRight />
        </button>
      </footer>
    </div>
  );
}

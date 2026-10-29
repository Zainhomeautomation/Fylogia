import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePageTurn } from "./usePageTurn";
import DOMPurify from "dompurify";
import {
  X,
  Bookmark,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  AlignLeft,
  Columns2,
  Sparkles,
  Minus,
  Plus,
  Download,
  Check,
} from "lucide-react";
import type { Article, Preferences } from "./catalog";
import { dateLabel } from "./storage";
import { plain } from "./feeds";
export function Reader({
  article,
  prefs,
  saved,
  initialProgress,
  onSave,
  onPrefs,
  onProgress,
  onClose,
  onDownload,
  downloaded = false,
  downloading = false,
  offlineLabel,
}: {
  article: Article;
  prefs: Preferences;
  saved: boolean;
  initialProgress: number;
  onSave: () => void;
  onPrefs: (p: Partial<Preferences>) => void;
  onProgress: (ratio: number) => void;
  onClose: () => void;
  onDownload?: () => void;
  downloaded?: boolean;
  downloading?: boolean;
  offlineLabel?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null),
    content = useRef<HTMLDivElement>(null),
    close = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(0),
    [count, setCount] = useState(1),
    [width, setWidth] = useState(0),
    [spread, setSpread] = useState(1),
    [summary, setSummary] = useState(""),
    [summaryBusy, setSummaryBusy] = useState(false);
  usePageTurn(viewport, page, prefs.reading === "pages");
  const position = useRef(initialProgress);
  // Keep a real text location across column reflow; the stored ratio remains
  // compatible with existing bookmarks and exports.
  const anchor = useRef<Range | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (
        !content.current ||
        !viewport.current ||
        prefs.reading !== "pages" ||
        count <= 1
      )
        return;
      const bounds = viewport.current.getBoundingClientRect();
      const walker = document.createTreeWalker(
        content.current,
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        if (
          ![...range.getClientRects()].some(
            (r) =>
              r.left >= bounds.left - 1 &&
              r.left < bounds.right &&
              r.bottom > bounds.top,
          )
        )
          continue;
        for (let i = 0; i < node.textContent.length; i++) {
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect();
          if (
            r.width &&
            r.left >= bounds.left - 1 &&
            r.left < bounds.right &&
            r.top >= bounds.top - 1
          ) {
            anchor.current = range.cloneRange();
            return;
          }
        }
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [page, width, spread, count, prefs.reading]);
  const start = useRef<{ x: number; y: number } | null>(null),
    restored = useRef(false);
  let html = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "figure",
      "figcaption",
      "img",
      "a",
    ],
    ALLOWED_ATTR: ["src", "alt", "href", "title"],
    FORBID_ATTR: ["style", "srcset"],
  }).replace(/<img /g, '<img referrerpolicy="no-referrer" ');
  // Promote the credited lead figure rather than showing the same photo twice.
  let leadCaption = "";
  if (article.image) {
    const document = new DOMParser().parseFromString(html, "text/html");
    const figure = [...document.querySelectorAll("figure")].find(
      (figure) =>
        figure.querySelectorAll("img").length === 1 &&
        figure.querySelector("img")?.getAttribute("src") === article.image,
    );
    if (figure) {
      leadCaption = figure.querySelector("figcaption")?.textContent || "";
      figure.remove();
      html = document.body.innerHTML;
    }
  }
  const measure = () => {
    if (!viewport.current || !content.current) return;
    const w = viewport.current.clientWidth;
    setWidth(w);
    setSpread(w >= Math.max(680, prefs.fontSize * 36) ? 2 : 1);
    requestAnimationFrame(() => {
      if (content.current) {
        const n = Math.max(
          1,
          Math.ceil((content.current.scrollWidth + 40) / (w + 40)),
        );
        setCount(n);
        if (n > 1) restored.current = true;
        const location = anchor.current?.startContainer.isConnected
          ? Math.floor(
              (anchor.current.getBoundingClientRect().left -
                content.current.getBoundingClientRect().left +
                1) /
                (w + 40),
            )
          : Math.round(position.current * (n - 1));
        setPage(Math.max(0, Math.min(n - 1, location)));
      }
    });
  };
  useLayoutEffect(() => {
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    measure();
    document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [prefs.reading, prefs.fontSize]);
  useEffect(() => {
    position.current = count > 1 ? page / (count - 1) : initialProgress;
    if (restored.current || initialProgress === 0)
      onProgress(count > 1 ? page / (count - 1) : 0);
  }, [page, count, onProgress, initialProgress]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    close.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (summary) setSummary("");
        else onClose();
      }
      if (e.key === "ArrowRight") setPage((p) => Math.min(count - 1, p + 1));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(0, p - 1));
      if (e.key === "Tab") {
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>(
            summary
              ? ".summary-panel button"
              : ".reader button:not(:disabled), .reader a[href]",
          ),
        ).filter((element) => !element.closest("[inert]"));
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [count, onClose, summary]);
  useEffect(() => {
    if (!summary) return;
    const previous = document.activeElement as HTMLElement;
    document.querySelector<HTMLButtonElement>(".summary-panel button")?.focus();
    return () => previous?.focus();
  }, [summary]);
  async function summarize() {
    setSummaryBusy(true);
    try {
      const api = (globalThis as any).Summarizer;
      if (!api) throw new Error("Unavailable");
      const engine = await api.create({
        type: "key-points",
        length: "short",
        format: "plain-text",
      });
      setSummary(
        "On-device AI summary\n" +
          (await engine.summarize(plain(article.content))),
      );
      engine.destroy();
    } catch {
      const text = plain(article.content);
      const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
      setSummary(
        "AI summarization is unavailable in this browser. Key passages below are extracted locally from the available " +
          (article.full ? "article" : "publisher preview") +
          "; this is not an AI summary.\n\n" +
          sentences.slice(0, 3).join(" ").trim(),
      );
    } finally {
      setSummaryBusy(false);
    }
  }
  return (
    <div
      className="reader"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
    >
      <header className="reader-toolbar">
        <button
          ref={close}
          className="icon-button"
          aria-label="Close reader"
          onClick={onClose}
        >
          <X />
        </button>
        <span className="wordmark">Fylogia</span>
        <div className="reader-actions">
          <button
            className="icon-button"
            aria-label="Summarize article"
            disabled={summaryBusy}
            onClick={summarize}
          >
            <Sparkles size={19} />
          </button>
          <button
            className="icon-button"
            aria-label="Decrease text size"
            disabled={prefs.fontSize <= 16}
            onClick={() => onPrefs({ fontSize: prefs.fontSize - 1 })}
          >
            <Minus size={17} />
          </button>
          <span>Aa</span>
          <button
            className="icon-button"
            aria-label="Increase text size"
            disabled={prefs.fontSize >= 26}
            onClick={() => onPrefs({ fontSize: prefs.fontSize + 1 })}
          >
            <Plus size={17} />
          </button>
          <button
            className="icon-button"
            aria-label={
              prefs.reading === "pages"
                ? "Switch to scrolling"
                : "Switch to pages"
            }
            onClick={() =>
              onPrefs({
                reading: prefs.reading === "pages" ? "scroll" : "pages",
              })
            }
          >
            {prefs.reading === "pages" ? (
              <AlignLeft size={20} />
            ) : (
              <Columns2 size={20} />
            )}
          </button>
          <button
            className={"icon-button " + (saved ? "is-saved" : "")}
            aria-label={saved ? "Unsave article" : "Save article"}
            onClick={onSave}
          >
            <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </header>
      {onDownload && (
        <div className="reader-download-strip">
          <span>
            {offlineLabel ||
              "Download this feed article or preview to read without a connection."}
          </span>
          <button
            className="text-button"
            disabled={downloaded || downloading || !navigator.onLine}
            onClick={onDownload}
            aria-label="Download current article"
          >
            {downloaded ? <Check size={15} /> : <Download size={15} />}{" "}
            {downloaded
              ? "Downloaded"
              : downloading
                ? "Downloading…"
                : "Download"}
          </button>
        </div>
      )}
      <div
        className={
          "reader-viewport " +
          (prefs.reading === "scroll" ? "scrolling" : "paginated")
        }
        data-spread={spread}
        ref={viewport}
        onTouchStart={(e) => {
          start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (start.current !== null && prefs.reading === "pages") {
            const dx = e.changedTouches[0].clientX - start.current.x;
            const dy = e.changedTouches[0].clientY - start.current.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
              setPage((p) =>
                Math.max(0, Math.min(count - 1, p + (dx < 0 ? 1 : -1))),
              );
          }
          start.current = null;
        }}
      >
        <div
          ref={content}
          className="reader-content"
          style={{
            fontSize: prefs.fontSize,
            columnCount: prefs.reading === "pages" ? spread : undefined,
            transform:
              prefs.reading === "pages"
                ? `translateX(-${page * (width + 40)}px)`
                : "none",
          }}
          onLoad={measure}
        >
          <div className="article-source">
            {article.source} · {dateLabel(article.published)}
          </div>
          <h1>{article.title}</h1>
          {article.image && (
            <figure>
              <img
                src={article.image}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  measure();
                }}
              />
              <figcaption>
                {leadCaption ||
                  `Image supplied in the ${article.source} feed. Rights remain with the credited owner.`}
              </figcaption>
            </figure>
          )}
          {!article.full && (
            <p className="preview-note">
              Publisher preview · Full-content republication permission is not
              verified for this source. Open the original for the complete
              story.
            </p>
          )}
          <div
            className="article-body"
            dangerouslySetInnerHTML={{ __html: html }}
            onClick={(e) => {
              const link = (e.target as HTMLElement).closest("a");
              if (link) {
                e.preventDefault();
                const url = new URL(
                  link.getAttribute("href") || "",
                  article.url,
                );
                if (["https:", "http:"].includes(url.protocol))
                  window.open(url.href, "_blank", "noopener,noreferrer");
              }
            }}
          />
          <div className="article-end">
            <p>
              {article.full
                ? "Article content supplied by the publisher’s RSS feed. NASA material may include third-party credits."
                : "Fylogia displays this publisher’s feed preview. The original may have its own access requirements."}
            </p>
            <a
              className="primary"
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read original <ArrowUpRight size={17} />
            </a>
            <button
              className="secondary"
              disabled={summaryBusy}
              onClick={summarize}
            >
              <Sparkles size={16} />
              {summaryBusy ? "Summarizing…" : "Summarize"}
            </button>
          </div>
        </div>
      </div>
      <footer className="reader-footer">
        {prefs.reading === "pages" ? (
          <>
            <button
              className="secondary"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <span role="status">
              {spread === 2 ? "Spread" : "Page"} {page + 1} of {count}
            </span>
            <button
              className="secondary"
              aria-label="Next page"
              disabled={page === count - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </>
        ) : (
          <span>Scroll reading · {article.source}</span>
        )}
      </footer>
      {summary && (
        <div className="summary-backdrop">
          <section
            className="summary-panel"
            role="alertdialog"
            aria-modal="true"
            aria-label="Article summary"
          >
            <button
              className="icon-button"
              aria-label="Close summary"
              onClick={() => setSummary("")}
            >
              <X />
            </button>
            <h2>A shorter read</h2>
            <p style={{ whiteSpace: "pre-line" }}>{summary}</p>
            <button className="primary" onClick={() => setSummary("")}>
              Back to reading
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

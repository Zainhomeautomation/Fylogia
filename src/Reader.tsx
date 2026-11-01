import { magazineSpread } from "./magazine-layout";
import { BrandHome } from "./BrandHome";
import { BrandMark } from "./BrandMark";
import { classifyApple } from "./apple-taxonomy";
import {
  mediaImage,
  restrictedNasaMedia,
  omitRestrictedFigures,
} from "./media-rights";
import { PageTurnControls } from "./PageTurnControls";
import { useReaderReturn, isolateReaderLayer } from "./useReaderReturn";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePageTurn } from "./usePageTurn";
import DOMPurify from "dompurify";
import {
  Ellipsis,
  ArrowLeft,
  House,
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
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { Article, Preferences } from "./catalog";
import { PublicationDate } from "./PublicationDate";
import { plain } from "./article-html";
export function Reader({
  article,
  prefs,
  saved,
  initialProgress,
  onSave,
  onPrefs,
  onProgress,
  onClose,
  onHome,
  onDownload,
  downloaded = false,
  downloading = false,
  offlineLabel,
  downloadNotice,
  manageReturn = true,
  nextStory,
  onNextStory,
  onContents,
  editionPosition,
}: {
  manageReturn?: boolean;
  nextStory?: string;
  onNextStory?: () => void;
  onContents?: () => void;
  editionPosition?: string;
  article: Article;
  prefs: Preferences;
  saved: boolean;
  initialProgress: number;
  onSave: () => void;
  onPrefs: (p: Partial<Preferences>) => void;
  onProgress: (ratio: number) => void;
  onClose: () => void;
  onHome: () => void;
  onDownload?: () => void;
  downloaded?: boolean;
  downloading?: boolean;
  offlineLabel?: string;
  downloadNotice?: string;
}) {
  const goHome = useReaderReturn(onHome, manageReturn);
  // Previews stay in one readable column with their publisher action visible.
  // The user’s page/scroll preference still applies to complete articles.
  const reading = article.full ? prefs.reading : "scroll";
  const displayImage = mediaImage(article);
  const restrictedMedia = restrictedNasaMedia(article);
  const viewport = useRef<HTMLDivElement>(null),
    content = useRef<HTMLDivElement>(null),
    close = useRef<HTMLButtonElement>(null);
  const [immersive, setImmersive] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const optionsButton = useRef<HTMLButtonElement>(null),
    optionsPanel = useRef<HTMLDivElement>(null);
  const pageValue = useRef(0);
  const [page, setPageState] = useState(0),
    [count, setCount] = useState(1),
    [width, setWidth] = useState(0),
    [spread, setSpread] = useState(1),
    [summary, setSummary] = useState(""),
    [summaryBusy, setSummaryBusy] = useState(false);
  const navigation = useRef(true);
  const applyPage = useCallback(
    (next: number | ((previous: number) => number)) => {
      const nextPage = Math.max(
        0,
        Math.min(
          count - 1,
          typeof next === "function" ? next(pageValue.current) : next,
        ),
      );
      pageValue.current = nextPage;
      navigation.current = true;
      anchor.current = null;
      position.current = count > 1 ? nextPage / (count - 1) : 0;
      onProgress(position.current);
      setOptionsOpen(false);
      if (immersive) setChromeVisible(false);
      setPageState(nextPage);
    },
    [count, onProgress, immersive],
  );
  useLayoutEffect(() => {
    pageValue.current = page;
  }, [page]);
  const curl = usePageTurn(viewport, page, reading === "pages", undefined, {
    previous: page > 0,
    next: page < count - 1,
    step: (forward) =>
      applyPage((p) =>
        Math.max(0, Math.min(count - 1, p + (forward ? 1 : -1))),
      ),
  });
  const setPage = useCallback(
    (next: number | ((previous: number) => number)) => {
      const value = typeof next === "function" ? next(pageValue.current) : next;
      if (value === pageValue.current) return;
      curl.navigate(value > pageValue.current, () => applyPage(next));
    },
    [applyPage, curl],
  );
  const [openingProgress] = useState(initialProgress);
  const position = useRef(openingProgress);
  const scrollSave = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (scrollSave.current !== undefined) {
        clearTimeout(scrollSave.current);
        onProgress(position.current);
      }
    },
    [onProgress],
  );
  // Keep a real text location across column reflow; the stored ratio remains
  // compatible with existing bookmarks and exports.
  const anchor = useRef<Range | null>(null);
  useLayoutEffect(() => {
    if (
      !content.current ||
      !viewport.current ||
      reading !== "pages" ||
      count <= 1 ||
      (!navigation.current && anchor.current?.startContainer.isConnected)
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
  }, [page, width, spread, count, reading]);

  const restored = useRef(false);
  const { html, leadCaption } = useMemo(() => {
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
        "h4",
        "h5",
        "h6",
        "pre",
        "code",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "sup",
        "sub",
        "dl",
        "dt",
        "dd",
        "ul",
        "ol",
        "li",
        "blockquote",
        "figure",
        "figcaption",
        "img",
        "a",
      ],
      ALLOWED_ATTR: ["src", "alt", "href", "title", "colspan", "rowspan"],
      FORBID_ATTR: ["style", "srcset"],
    }).replace(/<img /g, '<img referrerpolicy="no-referrer" ');
    // Promote the credited lead figure rather than showing the same photo twice.
    if (restrictedMedia) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      omitRestrictedFigures(doc);
      html = doc.body.innerHTML;
    }
    let leadCaption = "";
    if (displayImage) {
      const document = new DOMParser().parseFromString(html, "text/html");
      const figure = [...document.querySelectorAll("figure")].find(
        (figure) =>
          figure.querySelectorAll("img").length === 1 &&
          figure.querySelector("img")?.getAttribute("src") === displayImage,
      );
      if (figure) {
        leadCaption = figure.querySelector("figcaption")?.textContent || "";
        figure.remove();
        html = document.body.innerHTML;
      }
    }
    return { html, leadCaption };
  }, [article.content, displayImage, restrictedMedia]);
  const measuring = useRef(false);
  const measurementFrame = useRef(0);
  const measurementTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const measure = () => {
    cancelAnimationFrame(measurementFrame.current);
    clearTimeout(measurementTimer.current);
    if (!viewport.current || !content.current) return;
    const w = viewport.current.clientWidth;
    viewport.current.style.setProperty(
      "--reader-page-height",
      `${viewport.current.clientHeight}px`,
    );
    if (reading === "scroll") {
      anchor.current = null;
      setWidth(w);
      setSpread(1);
      setCount(1);
      // The scrolling DOM is already committed in the layout effect. Restore
      // synchronously so a delayed frame cannot overwrite the user's next scroll.
      viewport.current.scrollTop =
        position.current *
        Math.max(
          0,
          viewport.current.scrollHeight - viewport.current.clientHeight,
        );
      return;
    }
    // Width/spread commit before the deferred measurement. Retain the text
    // anchor through both renders, and through repeated fold/unfold changes.
    measuring.current = true;
    navigation.current = false;
    setWidth(w);
    setSpread(
      article.full
        ? magazineSpread(
            w,
            window.innerWidth,
            window.innerHeight,
            Math.max(340, prefs.fontSize * 18),
          )
        : 1,
    );
    let measured = false;
    const finishMeasurement = () => {
      if (measured) return;
      measured = true;
      cancelAnimationFrame(measurementFrame.current);
      clearTimeout(measurementTimer.current);
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
        navigation.current = false;
        setPageState(Math.max(0, Math.min(n - 1, location)));
        measuring.current = false;
      }
    };
    measurementFrame.current = requestAnimationFrame(finishMeasurement);
    measurementTimer.current = setTimeout(finishMeasurement, 80);
  };
  useLayoutEffect(() => {
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    measure();
    document.fonts.ready.then(measure);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
      clearTimeout(measurementTimer.current);
      observer.disconnect();
      cancelAnimationFrame(measurementFrame.current);
    };
  }, [reading, prefs.fontSize, html]);
  useEffect(() => {
    if (reading !== "pages" || measuring.current) return;
    position.current = count > 1 ? page / (count - 1) : openingProgress;
    if (restored.current || openingProgress === 0)
      onProgress(count > 1 ? page / (count - 1) : 0);
  }, [page, count, onProgress, openingProgress, reading]);
  useEffect(() => {
    close.current?.focus();
    // A containing Daily Magazine owns the lock for the entire issue.
    if (!manageReturn) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [manageReturn]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (summary) setSummary("");
        else if (optionsOpen) {
          setOptionsOpen(false);
          optionsButton.current?.focus();
        } else onClose();
      }
      if (
        reading === "pages" &&
        !summary &&
        !optionsOpen &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setPage((p) => Math.min(count - 1, p + 1));
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setPage((p) => Math.max(0, p - 1));
        }
      }
      if (e.key === "Tab") {
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>(
            summary
              ? ".summary-panel button"
              : ".reader button:not(:disabled), .reader a[href]",
          ),
        ).filter(
          (element) =>
            !element.closest("[inert]") && element.getClientRects().length > 0,
        );
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
  }, [count, onClose, summary, setPage, optionsOpen, reading]);
  useEffect(() => {
    if (!summary) return;
    const panel = document.querySelector<HTMLElement>(".summary-panel");
    const restore = panel
      ? isolateReaderLayer(
          panel,
          panel.closest<HTMLElement>(".reader") || undefined,
        )
      : () => {};
    document.querySelector<HTMLButtonElement>(".summary-panel button")?.focus();
    return () => {
      restore();
      optionsButton.current?.focus();
    };
  }, [summary]);
  async function summarize() {
    setOptionsOpen(false);
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
      className={`reader ${!article.full ? "preview-reader" : ""} ${immersive ? "immersive" : ""} ${immersive && !chromeVisible ? "chrome-hidden" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
    >
      <header className="reader-toolbar">
        <div className="reader-navigation">
          <button
            ref={close}
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
        <button
          className="icon-button focus-toggle"
          aria-label={
            immersive ? "Exit immersive reading" : "Enter immersive reading"
          }
          aria-pressed={immersive}
          onClick={() => {
            setImmersive(!immersive);
            setChromeVisible(immersive);
            setOptionsOpen(false);
          }}
        >
          {immersive ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <div className="reader-primary-save">
          <button
            className={"icon-button " + (saved ? "is-saved" : "")}
            aria-label={saved ? "Unsave article" : "Save article"}
            onClick={onSave}
          >
            <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <button
          ref={optionsButton}
          className="icon-button reader-options-toggle"
          aria-label="Reading options"
          title="Reading options"
          aria-expanded={optionsOpen}
          aria-controls="article-reading-options"
          onClick={() => {
            setOptionsOpen(!optionsOpen);
            setChromeVisible(true);
          }}
        >
          <Ellipsis size={22} />
        </button>
        <div
          ref={optionsPanel}
          id="article-reading-options"
          role="group"
          aria-label="Reading options"
          hidden={!optionsOpen}
          className="reader-actions reader-options-panel"
        >
          <button
            className="icon-button"
            aria-label="Summarize article"
            disabled={summaryBusy}
            onClick={summarize}
          >
            <Sparkles size={19} />
            <span>Summarize</span>
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
          {article.full && (
            <button
              className="icon-button"
              aria-label={
                reading === "pages" ? "Switch to scrolling" : "Switch to pages"
              }
              onClick={() =>
                onPrefs({
                  reading: reading === "pages" ? "scroll" : "pages",
                })
              }
            >
              {reading === "pages" ? (
                <AlignLeft size={20} />
              ) : (
                <Columns2 size={20} />
              )}
              <span>{reading === "pages" ? "Scroll" : "Pages"}</span>
            </button>
          )}
        </div>
      </header>
      {onDownload && (article.content || article.excerpt) && (
        <div className="reader-download-strip">
          <span
            className={downloadNotice ? "reader-download-notice" : undefined}
            role={downloadNotice ? "status" : undefined}
            title={downloadNotice || offlineLabel}
          >
            {downloadNotice ||
              (downloaded
                ? "Available offline"
                : downloading
                  ? "Downloading…"
                  : navigator.onLine
                    ? "Keep for offline"
                    : "Offline · Download unavailable")}
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
          (reading === "scroll" ? "scrolling" : "paginated")
        }
        data-spread={spread}
        onClick={(event) => {
          if (optionsOpen && !(event.target as HTMLElement).closest("button,a"))
            setOptionsOpen(false);
          if (
            immersive &&
            !curl.handledSwipe() &&
            !(event.target as HTMLElement).closest("button,a") &&
            window.getSelection()?.isCollapsed
          )
            setChromeVisible((v) => !v);
        }}
        onScroll={(event) => {
          if (reading !== "scroll") return;
          const element = event.currentTarget;
          const max = element.scrollHeight - element.clientHeight;
          if (max > 0) {
            position.current = element.scrollTop / max;
            if (scrollSave.current === undefined)
              scrollSave.current = window.setTimeout(() => {
                scrollSave.current = undefined;
                onProgress(position.current);
              }, 250);
          }
        }}
        ref={viewport}
      >
        <div
          ref={content}
          className="reader-content"
          style={{
            fontSize: prefs.fontSize,
            columnCount:
              reading === "pages" ? spread : article.full ? undefined : 1,
            transform:
              reading === "pages"
                ? `translateX(-${page * (width + 40)}px)`
                : "none",
          }}
          onLoad={measure}
        >
          <div className="article-source">
            {article.source} · Published <PublicationDate article={article} />
            {classifyApple(article).kind && (
              <> · {classifyApple(article).kind}</>
            )}
          </div>
          {(article.contentDetails?.retrievedAt || article.retrievedAt) && (
            <div className="article-retrieved">
              Received by Fylogia{" "}
              {new Date(
                article.contentDetails?.retrievedAt || article.retrievedAt!,
              ).toLocaleString("en", { timeZoneName: "short" })}
            </div>
          )}
          <h1>{article.title}</h1>
          {article.author && (
            <p className="article-byline">By {article.author}</p>
          )}
          {article.full && (
            <p className="reading-detail">
              Full article · Publisher-provided text ·{" "}
              {Math.max(
                1,
                Math.ceil(plain(article.content).split(/\s+/).length / 220),
              )}{" "}
              min read
            </p>
          )}
          {!article.full && (
            <p className="preview-note">
              {article.content || article.excerpt
                ? "Article preview — Continue reading at the original publisher."
                : "This saved link has no article text on this device. Continue reading at the publisher."}
              <a
                className="primary continue-reading"
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Continue Reading <ArrowUpRight size={17} />
              </a>
            </p>
          )}
          {displayImage && (
            <figure>
              <img
                src={displayImage}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const figure = e.currentTarget.closest("figure");
                  if (figure) figure.style.display = "none";
                  measure();
                }}
              />
              <figcaption>
                {leadCaption ||
                  `Image supplied in the ${article.source} feed. Rights remain with the credited owner.`}
              </figcaption>
            </figure>
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
                ? "Publisher-provided full text, formatted for Fylogia. Attribution and credits are retained."
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
      {reading === "pages" && count > 1 && (
        <PageTurnControls
          curl={curl}
          previous={page > 0 ? () => setPage((p) => p - 1) : undefined}
          next={page < count - 1 ? () => setPage((p) => p + 1) : undefined}
        />
      )}
      {onContents && (
        <div className="daily-story-navigation">
          <button className="text-button" onClick={onContents}>
            Contents
          </button>
          <span>{editionPosition}</span>
          {(reading === "scroll" || page === count - 1) && onNextStory && (
            <button
              className="secondary"
              onClick={() => {
                if (scrollSave.current !== undefined) {
                  clearTimeout(scrollSave.current);
                  scrollSave.current = undefined;
                }
                onNextStory();
              }}
              title={nextStory}
            >
              Next story <ChevronRight size={16} />
            </button>
          )}
          {(reading === "scroll" || page === count - 1) && !onNextStory && (
            <span>End of edition</span>
          )}
        </div>
      )}
      <footer className="reader-footer">
        {reading === "pages" ? (
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
          <span>
            {article.full ? "Scroll reading" : "Publisher preview"} ·{" "}
            {article.source}
          </span>
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

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Article } from "./catalog";
import { usePageTurn } from "./usePageTurn";

/** A bounded news book. Story identity survives resize and reader overlays. */
export function NewsFeed({
  articles,
  renderStory,
}: {
  articles: Article[];
  renderStory: (article: Article, current: boolean) => ReactNode;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const neighbors = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState(articles[0]?.id);
  const [spread, setSpread] = useState(1);
  const index = Math.max(
    0,
    articles.findIndex((a) => a.id === anchor),
  );
  const start = Math.floor(index / spread) * spread;
  const previous = start > 0;
  const next = start + spread < articles.length;
  useLayoutEffect(() => {
    const node = surface.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Both sheets need a comfortable measure; no device-name detection.
      setSpread(width >= 760 && width / height >= 1.2 ? 2 : 1);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const step = (forward: boolean) => {
    // A queued turn must advance from the committed anchor, not the render
    // that received a rapid second tap.
    setAnchor((old) => {
      const current = Math.max(
        0,
        articles.findIndex((a) => a.id === old),
      );
      const at = Math.floor(current / spread) * spread;
      const target = Math.max(
        0,
        Math.min(articles.length - 1, at + (forward ? spread : -spread)),
      );
      return articles[target].id;
    });
  };
  const curl = usePageTurn(
    surface,
    start,
    true,
    async (forward, signal) => {
      const destination = neighbors.current?.querySelector<HTMLElement>(
        `[data-feed-neighbor="${forward ? "next" : "previous"}"]`,
      );
      if (!destination || signal.aborted) return;
      const node = document.createElement("div");
      node.className = "news-feed-surface";
      node.dataset.paperArticle = "true";
      node.dataset.paperSpread = String(spread);
      const pages = destination.cloneNode(true) as HTMLElement;
      pages.removeAttribute("data-feed-neighbor");
      node.append(pages);
      return node;
    },
    {
      previous,
      next,
      step,
      horizontalOnly: true,
      contentOpenSelector: "[data-feed-open]",
    },
  );
  const turn = (forward: boolean) => {
    if (forward ? next : previous) curl.navigate(forward, () => step(forward));
  };
  const pages = (at: number, neighbor?: string) => (
    <div
      className="feed-spread"
      data-feed-neighbor={neighbor}
      style={{ gridTemplateColumns: `repeat(${spread}, minmax(0, 1fr))` }}
    >
      {articles.slice(at, at + spread).map((a) => (
        <div
          className="feed-sheet"
          key={a.id}
          data-story-id={a.id}
          onClickCapture={(event) => {
            // A facing spread has two possible entry points. Remember the one
            // actually opened, including resizing while the reader overlays it.
            if ((event.target as Element).closest("[data-feed-open]"))
              setAnchor(a.id);
          }}
        >
          {renderStory(a, !neighbor)}
        </div>
      ))}
      {spread === 2 && at + 1 >= articles.length && (
        <div className="feed-sheet feed-end">
          <p>You’re all caught up.</p>
        </div>
      )}
    </div>
  );
  return (
    <section
      className="news-book"
      aria-label="Page-flipping news"
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("input,textarea,select"))
          return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          turn(event.key === "ArrowRight");
        }
      }}
    >
      <div
        ref={surface}
        className="news-feed-surface"
        data-paper-article="true"
        data-paper-spread={spread}
        role="group"
        tabIndex={0}
        aria-label="News pages. Swipe horizontally or use the page buttons."
      >
        {pages(start)}
        {previous && (
          <button
            className="feed-edge feed-edge-previous"
            aria-label="Previous news page"
            title="Previous news page"
            onClick={() => turn(false)}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {next && (
          <button
            className="feed-edge feed-edge-next"
            aria-label="Next news page"
            title="Next news page"
            onClick={() => turn(true)}
          >
            <ArrowRight size={18} />
          </button>
        )}
      </div>
      <div ref={neighbors} className="feed-preload" aria-hidden="true" inert>
        {previous && pages(Math.max(0, start - spread), "previous")}
        {next && pages(start + spread, "next")}
      </div>
      <div className="feed-pagination">
        <button
          className="icon-button"
          aria-label="Previous stories"
          disabled={!previous}
          onClick={() => turn(false)}
        >
          <ArrowLeft size={20} />
        </button>
        <span aria-live="polite" aria-atomic="true">
          Story {start + 1}
          {spread === 2 && start + 1 < articles.length
            ? `–${Math.min(articles.length, start + spread)}`
            : ""}{" "}
          of {articles.length}
        </span>
        <button
          className="icon-button"
          aria-label="Next stories"
          disabled={!next}
          onClick={() => turn(true)}
        >
          <ArrowRight size={20} />
        </button>
      </div>
      <p className="feed-guidance">
        Swipe or drag the page edge to browse · Tap a story to read
      </p>
    </section>
  );
}

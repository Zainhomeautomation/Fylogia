import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Article } from "./catalog";
import { magazineSpread } from "./magazine-layout";
import { usePageTurn } from "./usePageTurn";

/** A bounded news book. Story identity survives resize and reader overlays. */
export function NewsFeed({
  articles,
  renderStory,
  presentation = "pages",
}: {
  articles: Article[];
  presentation?: "pages" | "scroll";
  renderStory: (
    article: Article,
    current: boolean,
    magazinePage: boolean,
  ) => ReactNode;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const neighbors = useRef<HTMLDivElement>(null);
  const previousPresentation = useRef(presentation);
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
    const measure = () => {
      const width = node.clientWidth;
      // Use available page space, not content height: long headlines must not
      // oscillate between one and two columns as the sheet grows.
      const viewport = window.visualViewport;
      setSpread(
        magazineSpread(
          width,
          viewport?.width || window.innerWidth,
          viewport?.height || window.innerHeight,
        ),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);
  useLayoutEffect(() => {
    const previousMode = previousPresentation.current;
    if (previousMode === presentation) return;
    previousPresentation.current = presentation;
    const selector =
      presentation === "pages"
        ? surface.current
        : surface.current?.querySelector<HTMLElement>(
            `[data-story-id="${CSS.escape(anchor || "")}"]`,
          );
    if (!selector) return;
    const top = selector.getBoundingClientRect().top;
    const headerRect = document
      .querySelector(".mobile-header")
      ?.getBoundingClientRect();
    const header = headerRect
      ? Math.max(0, Math.min(headerRect.height, headerRect.bottom))
      : 0;
    window.scrollBy({ top: top - header - 12, behavior: "instant" });
  }, [anchor, presentation]);
  useEffect(() => {
    if (presentation !== "scroll") return;
    let frame = 0;
    const updateAnchor = () => {
      frame = 0;
      const stories = surface.current?.querySelectorAll<HTMLElement>(
        ".news-feed-list [data-story-id]",
      );
      if (!stories?.length) return;
      const readingLine =
        (document.querySelector(".mobile-header")?.getBoundingClientRect()
          .height || 0) + 24;
      const visible = [...stories].find(
        (story) => story.getBoundingClientRect().bottom > readingLine,
      );
      const id = visible?.dataset.storyId;
      if (id) setAnchor((old) => (old === id ? old : id));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateAnchor);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    updateAnchor();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [presentation, articles]);
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
    presentation === "pages",
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
          {renderStory(a, !neighbor, true)}
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
      className={`news-book ${presentation === "scroll" ? "news-scroll-book" : ""}`}
      aria-label={
        presentation === "pages" ? "Page-flipping news" : "Scrolling news"
      }
      onKeyDown={(event) => {
        if (
          presentation !== "pages" ||
          (event.target as HTMLElement).closest("input,textarea,select")
        )
          return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          turn(event.key === "ArrowRight");
        }
      }}
    >
      <div
        ref={surface}
        className={`news-feed-surface ${presentation === "scroll" ? "scrolling-feed" : ""}`}
        data-paper-article="true"
        data-paper-spread={spread}
        data-spread={spread}
        role="group"
        tabIndex={0}
        aria-label={
          presentation === "pages"
            ? "News pages. Swipe horizontally or use the page buttons."
            : "News stories. Scroll vertically to read more."
        }
      >
        {presentation === "pages" ? (
          pages(start)
        ) : (
          <div className="news-feed-list">
            {articles.slice(0, 75).map((article, i) => (
              <div
                key={article.id}
                data-story-id={article.id}
                onClickCapture={() => setAnchor(article.id)}
              >
                {renderStory(article, article.id === anchor || i === 0, false)}
              </div>
            ))}
            {articles.length > 75 && (
              <p className="quiet">
                Showing the first 75 stories. Filter or search to discover more.
              </p>
            )}
          </div>
        )}
        {/* Hidden neighbors share the grid row's intrinsic height. The current
            and destination sheets therefore fit before a curl is captured. */}
        {presentation === "pages" && (
          <div
            ref={neighbors}
            className="feed-preload"
            aria-hidden="true"
            inert
          >
            {previous && pages(Math.max(0, start - spread), "previous")}
            {next && pages(start + spread, "next")}
          </div>
        )}
        {presentation === "pages" && (
          <button
            className="feed-edge feed-edge-previous"
            aria-label="Previous stories"
            disabled={!previous}
            data-page-turn-edge="previous"
            title="Previous page or spread"
            onClick={() => turn(false)}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        {presentation === "pages" && (
          <button
            className="feed-edge feed-edge-next"
            aria-label="Next stories"
            disabled={!next}
            data-page-turn-edge="next"
            title="Next page or spread"
            onClick={() => turn(true)}
          >
            <ArrowRight size={18} />
            <span className="feed-corner" aria-hidden="true" />
          </button>
        )}
      </div>
      {presentation === "pages" && (
        <div className="feed-pagination">
          <span aria-live="polite" aria-atomic="true">
            Story {start + 1}
            {spread === 2 && start + 1 < articles.length
              ? `–${Math.min(articles.length, start + spread)}`
              : ""}{" "}
            of {articles.length}
          </span>
        </div>
      )}
      {presentation === "pages" && (
        <p className="feed-guidance">
          Swipe or drag the page edge to browse · Tap a story to read
        </p>
      )}
    </section>
  );
}

import { BrandHome } from "./BrandHome";
import { BrandMark } from "./BrandMark";
import { mediaImage } from "./media-rights";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  House,
  Download,
  BookOpen,
  Check,
  ArrowRight,
} from "lucide-react";
import type { Article, Preferences } from "./catalog";
import type { DailyMagazine as Magazine } from "./daily-magazine";
import { Reader } from "./Reader";
import { useReaderReturn } from "./useReaderReturn";
export function DailyMagazine({
  edition,
  articles,
  prefs,
  progress,
  savedIds,
  downloadedIds,
  downloadingIds,
  online,
  busy,
  downloadNotice,
  onProgress,
  onOpen,
  onSave,
  onPrefs,
  onDownload,
  onClose,
  onHome,
}: {
  edition: Magazine;
  articles: Article[];
  prefs: Preferences;
  progress: Record<string, number>;
  savedIds: string[];
  downloadedIds: string[];
  downloadingIds: string[];
  online: boolean;
  busy: boolean;
  downloadNotice?: string;
  onProgress: (article: Article, ratio: number) => void;
  onOpen: (article: Article) => void;
  onSave: (article: Article) => void;
  onPrefs: (patch: Partial<Preferences>) => void;
  onDownload: (articles: Article[]) => void;
  onClose: () => void;
  onHome: () => void;
}) {
  const home = useReaderReturn(onHome);
  const [index, setIndex] = useState<number | null>(null);
  const [missing, setMissing] = useState("");
  const back = useRef<HTMLButtonElement>(null);
  const contentsBody = useRef<HTMLDivElement>(null);
  const contentsScroll = useRef(0);
  const lastStory = useRef<HTMLButtonElement | null>(null);
  const [initialArticles] = useState(
    () =>
      new Map(
        articles
          .filter(
            (a) =>
              (a.content || a.excerpt) &&
              edition.stories.some((s) => s.id === a.id),
          )
          .map((a) => [a.id, a]),
      ),
  );
  const library = useMemo(
    () =>
      new Map([...articles.map((a) => [a.id, a] as const), ...initialArticles]),
    [articles, initialArticles],
  );
  const available = edition.stories
    .map((s) => library.get(s.id))
    .filter(
      (a): a is Article =>
        !!a &&
        !!(a.content || a.excerpt) &&
        (online || downloadedIds.includes(a.id)),
    );
  const cover = library.get(edition.stories[0]?.id);
  const coverImage = cover ? mediaImage(cover) : undefined;
  const current =
    index === null ? undefined : library.get(edition.stories[index]?.id);
  const reportProgress = useCallback(
    (ratio: number) => {
      if (current) onProgress(current, ratio);
    },
    [current, onProgress],
  );
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  useEffect(() => {
    if (index !== null) return;
    if (contentsBody.current)
      contentsBody.current.scrollTop = contentsScroll.current;
    (lastStory.current?.isConnected ? lastStory.current : back.current)?.focus({
      preventScroll: true,
    });
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const buttons = [
        ...document.querySelectorAll<HTMLButtonElement>(
          ".daily-magazine button:not(:disabled)",
        ),
      ].filter((b) => b.getClientRects().length);
      if (e.shiftKey && document.activeElement === buttons[0]) {
        e.preventDefault();
        buttons.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === buttons.at(-1)) {
        e.preventDefault();
        buttons[0]?.focus();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, onClose]);
  function open(i: number) {
    const a = library.get(edition.stories[i]?.id);
    if (!a || (!online && !downloadedIds.includes(a.id))) {
      setMissing(
        "This story is not downloaded on this device. Connect to download it, or choose an available story.",
      );
      return;
    }
    setMissing("");
    if (index === null && contentsBody.current)
      contentsScroll.current = contentsBody.current.scrollTop;
    onOpen(a);
    setIndex(i);
  }
  const next =
    index === null
      ? -1
      : edition.stories.findIndex(
          (s, i) =>
            i > index &&
            library.has(s.id) &&
            (online || downloadedIds.includes(s.id)),
        );
  const sections = [...new Set(edition.stories.map((s) => s.section))];
  return (
    <div
      className="reader daily-magazine"
      role={current ? undefined : "dialog"}
      aria-modal={current ? undefined : true}
      aria-label={current ? undefined : "Today's Fylogia"}
    >
      {current && (
        <Reader
          key={current.id}
          article={current}
          prefs={prefs}
          saved={savedIds.includes(current.id)}
          initialProgress={progress[current.id] || 0}
          onSave={() => onSave(current)}
          onPrefs={onPrefs}
          onProgress={reportProgress}
          onClose={() => setIndex(null)}
          onHome={home}
          manageReturn={false}
          onContents={() => setIndex(null)}
          editionPosition={`Story ${index! + 1} of ${edition.stories.length}`}
          onNextStory={
            next >= 0
              ? () => {
                  onProgress(current, 1);
                  open(next);
                }
              : undefined
          }
          downloadNotice={downloadNotice}
          nextStory={next >= 0 ? edition.stories[next].title : undefined}
          downloaded={downloadedIds.includes(current.id)}
          downloading={downloadingIds.includes(current.id)}
          onDownload={() => onDownload([current])}
          offlineLabel={
            downloadedIds.includes(current.id)
              ? "Downloaded on this device. Some publisher images may be unavailable offline."
              : undefined
          }
        />
      )}
      <div className="daily-issue-shell" hidden={!!current} inert={!!current}>
        <header className="reader-toolbar">
          <div className="reader-navigation">
            <button
              ref={back}
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
              onClick={home}
            >
              <House />
            </button>
          </div>
          <BrandHome className="reader-brand-home" onHome={home}>
            <BrandMark />
            <span className="wordmark">Fylogia</span>
          </BrandHome>
          <button
            className="secondary"
            disabled={!online || busy || !available.length}
            onClick={() => onDownload(available)}
          >
            <Download size={16} />
            {busy ? "Downloading…" : "Download edition"}
          </button>
        </header>
        <div className="daily-magazine-body" ref={contentsBody}>
          {downloadNotice && (
            <p className="notice" role="status">
              {downloadNotice}
            </p>
          )}
          <section className="daily-cover" aria-labelledby="daily-title">
            {coverImage && (
              <img
                src={coverImage}
                alt=""
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
            )}
            <div className="daily-cover-copy">
              <span className="eyebrow">
                Your personal daily magazine · {edition.day}
              </span>
              <h1 id="daily-title">Today's Fylogia</h1>
              <p>
                {edition.stories.length} stories · {edition.region}
              </p>
              {cover && (
                <>
                  <span className="eyebrow">
                    The cover story · {cover.source}
                  </span>
                  <h2>{cover.title}</h2>
                  <p>{cover.excerpt.slice(0, 240)}</p>
                </>
              )}
              <button
                className="primary"
                disabled={!available.length}
                onClick={(e) => {
                  lastStory.current = e.currentTarget;
                  const resume = edition.stories.findIndex(
                    (s) =>
                      (progress[s.id] || 0) > 0 &&
                      (progress[s.id] || 0) < 0.98 &&
                      available.some((a) => a.id === s.id),
                  );
                  open(
                    resume >= 0
                      ? resume
                      : (() => {
                          const unread = edition.stories.findIndex(
                            (s) =>
                              (progress[s.id] || 0) < 0.98 &&
                              available.some((a) => a.id === s.id),
                          );
                          return unread >= 0
                            ? unread
                            : edition.stories.findIndex((s) =>
                                available.some((a) => a.id === s.id),
                              );
                        })(),
                  );
                }}
              >
                <BookOpen size={18} />
                Start reading <ArrowRight size={16} />
              </button>
            </div>
          </section>
          {missing && (
            <p className="notice" role="status">
              {missing}
            </p>
          )}
          {!online && (
            <p className="notice">
              Offline · {available.length} of {edition.stories.length} stories
              available on this device.
            </p>
          )}
          <section
            className="daily-contents"
            aria-labelledby="daily-contents-title"
          >
            <span className="eyebrow">A little time. A wider world.</span>
            <h2 id="daily-contents-title">In this edition</h2>
            {sections.map((section) => (
              <section key={section} aria-label={section}>
                <h3>{section}</h3>
                <ol>
                  {edition.stories.map(
                    (story, i) =>
                      story.section === section && (
                        <li key={story.id}>
                          <button
                            className="daily-contents-story"
                            onClick={(e) => {
                              lastStory.current = e.currentTarget;
                              open(i);
                            }}
                            aria-label={`Read story ${i + 1}: ${story.title}`}
                          >
                            <span className="daily-story-number">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>
                              <strong>{story.title}</strong>
                              <small>
                                {story.source} ·{" "}
                                {story.full
                                  ? "Complete article"
                                  : "Publisher preview"}
                                {downloadedIds.includes(story.id)
                                  ? " · Downloaded"
                                  : ""}
                                {!online && !downloadedIds.includes(story.id)
                                  ? " · Not downloaded"
                                  : ""}
                                {!library.has(story.id)
                                  ? " · Connect to find this story"
                                  : ""}
                              </small>
                              {(progress[story.id] || 0) > 0 && (
                                <progress
                                  max={1}
                                  value={progress[story.id]}
                                  aria-label={`Reading progress for ${story.title}`}
                                />
                              )}
                            </span>
                            {savedIds.includes(story.id) && (
                              <Check size={16} aria-label="Saved" />
                            )}
                          </button>
                        </li>
                      ),
                  )}
                </ol>
              </section>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

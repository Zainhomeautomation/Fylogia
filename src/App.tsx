import { lazy, Suspense } from "react";
import { incomingPairCode } from "./pair-link";
const SyncPanel = lazy(() => import("./SyncPanel"));
import { loadEdition } from "./edition-delivery";
import { DailyMagazine } from "./DailyMagazine";
import {
  createDailyMagazine,
  dailyPreferenceKey,
  localDay,
  type DailyMagazine as DailyMetadata,
} from "./daily-magazine";
import { withCurrentCategories, articleMatchesLibrary } from "./source-utils";
import { topicMatchesText } from "./interest-taxonomy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  Compass,
  LayoutGrid,
  Rss,
  Bookmark,
  BookOpen,
  History,
  Settings,
  Search,
  RefreshCw,
  Menu,
  X,
  ArrowRight,
  Moon,
  Sun,
  Monitor,
  Download,
} from "lucide-react";
import {
  defaults,
  sources,
  categories,
  regions,
  type Article,
  type Edition,
  type Preferences,
} from "./catalog";
import { useStored, useLocalProfile } from "./storage";
import { decodeLibrary, encryptLibrary } from "./library-backup";
import { replaceLocalLibrary, snapshotLibrary } from "./local-library";
import { Onboarding } from "./Onboarding";
import { StoryCard } from "./StoryCard";
import { Reader } from "./Reader";
import { Sources } from "./Sources";
import { Magazines } from "./Magazines";
import { useOfflineLibrary } from "./useOfflineLibrary";
import { OfflineLibrary } from "./OfflineLibrary";
import "./App.css";
import { BrandMark } from "./BrandMark";
import { useSectionRoute } from "./useSectionRoute";
const navigation = [
  { id: "home", label: "For You", icon: Home },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "categories", label: "Categories", icon: LayoutGrid },
  { id: "sources", label: "My Sources", icon: Rss },
  { id: "saved", label: "Saved Articles", icon: Bookmark },
  { id: "offline", label: "Offline Library", icon: Download },
  { id: "magazines", label: "Magazines", icon: BookOpen },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
];
const EMPTY: Edition = { generatedAt: "", articles: [], statuses: [] };
export default function App() {
  const [prefs, setPrefs, prefsError] = useStored<Preferences>(
    "preferences",
    defaults,
  );
  const [saved, setSaved, savedError] = useStored<Article[]>("saved", []);
  const [history, setHistory] = useStored<Article[]>("history", []);
  const [progress, setProgress] = useStored<Record<string, number>>(
    "progress",
    {},
  );
  const [dailyEditions, setDailyEditions, dailyError] = useStored<
    DailyMetadata[]
  >("dailyEditions", []);
  const [newsRequested, setNewsRequested] = useState(false);
  const newsEnabled = prefs.complete || newsRequested;
  const [dailyOpen, setDailyOpen] = useState<DailyMetadata>();
  const [custom, setCustom, customError] = useStored<Article[]>("custom", []);
  const [view, setView] = useSectionRoute();
  const newsScope = useMemo(() => {
    if (!prefs.complete || (view === "sources" && !dailyOpen)) return "health";
    if (view === "explore" || view === "categories") return "*";
    const ids = [...prefs.sourceIds];
    if (dailyOpen) {
      const names = new Set(dailyOpen.stories.map((story) => story.source));
      ids.push(
        ...[...sources, ...prefs.customSources]
          .filter((source) => names.has(source.name))
          .map((source) => source.id),
      );
    }
    if (view === "saved" || view === "history")
      ids.push(...(view === "saved" ? saved : history).map((a) => a.sourceId));
    return [...new Set(ids)].sort().join("\n");
  }, [
    prefs.complete,
    prefs.sourceIds,
    prefs.customSources,
    dailyOpen,
    view,
    saved,
    history,
  ]);
  const newsRequest = useRef<AbortController | undefined>(undefined);
  const [edition, setEdition] = useState<Edition>(EMPTY),
    [filter, setFilter] = useState("All stories"),
    [query, setQuery] = useState(""),
    [readableOnly, setReadableOnly] = useState(false),
    [reader, setReader] = useState<Article>(),
    [busy, setBusy] = useState(true),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [personalizing, setPersonalizing] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const profile = useLocalProfile();
  const [syncOpen, setSyncOpen] = useState(Boolean(incomingPairCode));
  const syncPanel = syncOpen ? (
    <Suspense fallback={<p role="status">Opening device sync…</p>}>
      <SyncPanel onClose={() => setSyncOpen(false)} />
    </Suspense>
  ) : null;
  const [backupPassword, setBackupPassword] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const offline = useOfflineLibrary();
  const {
    ready: offlineReady,
    refreshText,
    metadata: updateOfflineMetadata,
  } = offline;
  useEffect(() => {
    const savedIds = new Set(saved.map((article) => article.id));
    for (const item of offline.items) {
      const bookmarked = savedIds.has(item.id);
      const ratio = progress[item.id] ?? item.progress;
      if (item.bookmarked !== bookmarked || item.progress !== ratio)
        updateOfflineMetadata(item.id, { bookmarked, progress: ratio });
    }
  }, [saved, progress, offline.items, updateOfflineMetadata]);
  const [selecting, setSelecting] = useState(false),
    [selectedIds, setSelectedIds] = useState<string[]>([]);
  const readingRef = useRef({ saved, progress });
  useEffect(() => {
    readingRef.current = { saved, progress };
  }, [saved, progress]);
  const readingMetadata = useCallback(
    (article: Article) => ({
      bookmarked: readingRef.current.saved.some((a) => a.id === article.id),
      progress: readingRef.current.progress[article.id] || 0,
    }),
    [],
  );
  useEffect(() => {
    if (online && offlineReady && edition.articles.length)
      void refreshText(edition.articles);
  }, [online, edition, offlineReady, refreshText]);
  const patch = useCallback(
    (p: Partial<Preferences>) => setPrefs((v) => ({ ...v, ...p })),
    [setPrefs],
  );
  const refresh = useCallback(async () => {
    newsRequest.current?.abort();
    const controller = new AbortController();
    newsRequest.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);
    setBusy(true);
    try {
      const data = await loadEdition(
        import.meta.env.BASE_URL,
        newsScope,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setEdition((previous) =>
        data.delivery === "health" && previous.articles.length
          ? { ...previous, statuses: data.statuses }
          : data.delivery === "all" || previous.generatedAt !== data.generatedAt
            ? data
            : {
                ...data,
                articles: [
                  ...new Map(
                    [...previous.articles, ...data.articles].map((a) => [
                      a.id,
                      a,
                    ]),
                  ).values(),
                ],
              },
      );
      setNotice((previous) =>
        previous ===
        "Could not refresh. Your cached edition and saved articles remain available."
          ? ""
          : previous,
      );
    } catch {
      if (!controller.signal.aborted || timedOut)
        setNotice(
          "Could not refresh. Your cached edition and saved articles remain available.",
        );
    } finally {
      clearTimeout(timeout);
      if (newsRequest.current === controller) setBusy(false);
    }
  }, [newsScope]);
  useEffect(() => {
    if (!newsEnabled) return;
    void refresh();
    const interval = setInterval(refresh, 15 * 60 * 1000);
    return () => {
      clearInterval(interval);
      newsRequest.current?.abort();
    };
  }, [refresh, newsEnabled]);
  useEffect(() => {
    const on = () => {
        setOnline(true);
        if (newsEnabled) void refresh();
      },
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refresh, newsEnabled]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme =
        prefs.theme === "system"
          ? media.matches
            ? "navy"
            : "light"
          : prefs.theme;
      document.documentElement.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          theme === "navy"
            ? "#0A1018"
            : theme === "dark"
              ? "#121a17"
              : "#f8f6ef",
        );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [prefs.theme]);
  useEffect(() => {
    if (!prefs.customSources.length || !prefs.complete) return;
    let active = true;
    import("./feeds")
      .then(({ loadCustom }) =>
        Promise.allSettled(
          prefs.customSources.map((s) => loadCustom(s, prefs.converter)),
        ),
      )
      .then((results) => {
        if (!active) return;
        const articles = results.flatMap((r) =>
          r.status === "fulfilled" ? r.value : [],
        );
        if (articles.length)
          setCustom((old) =>
            [
              ...new Map([...old, ...articles].map((a) => [a.id, a])).values(),
            ].slice(-500),
          );
      })
      .catch(() => {
        if (active)
          setNotice(
            "Custom sources could not be refreshed. Your saved articles and offline copies remain available.",
          );
      });
    return () => {
      active = false;
    };
  }, [prefs.complete, prefs.customSources, prefs.converter, setCustom]);
  function navigate(id: string) {
    setBackupPassword("");
    setView(id);
    setFilter("All stories");
    setReadableOnly(false);
    setQuery("");
    setMenu(false);
    setSelecting(false);
    setSelectedIds([]);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  function save(article: Article) {
    offline.metadata(article.id, {
      bookmarked: !saved.some((a) => a.id === article.id),
    });
    setSaved((old) =>
      old.some((a) => a.id === article.id)
        ? old.filter((a) => a.id !== article.id)
        : [article, ...old],
    );
  }
  const recordVisit = useCallback(
    (article: Article) => {
      setHistory((old) =>
        [article, ...old.filter((a) => a.id !== article.id)].slice(0, 150),
      );
    },
    [setHistory],
  );
  function open(article: Article) {
    const copy = offline.items.find((r) => r.id === article.id);
    setReader(copy && (!online || view === "offline") ? copy.article : article);
    recordVisit(article);
  }
  const onProgress = useCallback(
    (ratio: number) => {
      if (reader) {
        updateOfflineMetadata(reader.id, { progress: ratio });
        setProgress((old) =>
          old[reader.id] === ratio ? old : { ...old, [reader.id]: ratio },
        );
      }
    },
    [reader, setProgress, updateOfflineMetadata],
  );
  const all = useMemo(
    () => [
      ...new Map(
        [
          ...(!online ? offline.items.map((r) => r.article) : []),
          ...edition.articles,
          ...custom.filter((a) =>
            prefs.customSources.some((s) => s.id === a.sourceId),
          ),
        ].map((a) => [a.id, a]),
      ).values(),
    ],
    [edition, custom, prefs.customSources, online, offline.items],
  );
  const displayedReader =
    reader && !(reader.content || reader.excerpt)
      ? all.find((a) => a.id === reader.id) || reader
      : reader;
  const sourceLabels = useMemo(
    () => new Map([...sources, ...prefs.customSources].map((s) => [s.id, s])),
    [prefs.customSources],
  );
  const articles = useMemo(() => {
    let result = (
      view === "saved" ? saved : view === "history" ? history : all
    ).map((a) =>
      withCurrentCategories(
        a.content || a.excerpt ? a : all.find((item) => item.id === a.id) || a,
        sourceLabels,
      ),
    );
    if (view === "home")
      result = result.filter((a) => articleMatchesLibrary(a, prefs));
    if (readableOnly) result = result.filter((a) => a.full);
    if (filter !== "All stories")
      result = result.filter((a) => a.categories.includes(filter));
    if (query.trim())
      result = result.filter((a) =>
        (a.title + " " + a.source + " " + a.excerpt)
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      );
    if (view === "home") {
      const score = (a: Article) =>
        prefs.topics.reduce(
          (n, t) => n + (topicMatchesText(t, a.title) ? 3 : 0),
          0,
        ) +
        (a.image ? 1 : 0) +
        (a.full ? 2 : 0);
      const scores = new Map(
        result.map((article) => [article.id, score(article)]),
      );
      result = [...result].sort(
        (a, b) =>
          scores.get(b.id)! - scores.get(a.id)! ||
          (b.published || "").localeCompare(a.published || ""),
      );
      const seen = new Set<string>();
      const first: Article[] = [],
        rest: Article[] = [];
      for (const a of result) {
        if (!seen.has(a.sourceId)) {
          first.push(a);
          seen.add(a.sourceId);
        } else rest.push(a);
      }
      result = [...first, ...rest];
    }
    return result;
  }, [
    view,
    all,
    saved,
    history,
    prefs.sourceIds,
    prefs.region,
    prefs.topics,
    sourceLabels,
    filter,
    query,
    readableOnly,
  ]);
  const dailyId = `${localDay()}-${dailyPreferenceKey(prefs)}`;
  const daily = useMemo(
    () =>
      dailyEditions.find((e) => e.id === dailyId) ||
      createDailyMagazine(
        all.map((a) => withCurrentCategories(a, sourceLabels)),
        prefs,
      ),
    [dailyEditions, dailyId, all, sourceLabels, prefs],
  );
  const dailyArticles = useMemo(
    () => [
      ...new Map(
        [
          ...saved,
          ...history,
          ...(online
            ? [...offline.items.map((r) => r.article), ...all]
            : [...all, ...offline.items.map((r) => r.article)]),
        ].map((a) => [a.id, a]),
      ).values(),
    ],
    [all, saved, history, offline.items, online],
  );
  function rememberDaily(value: DailyMetadata) {
    setDailyEditions((old) =>
      [value, ...old.filter((e) => e.id !== value.id)].slice(0, 7),
    );
    return value;
  }
  function downloadDaily(value: DailyMetadata) {
    rememberDaily(value);
    const byId = new Map(dailyArticles.map((a) => [a.id, a]));
    void offline.download(
      value.stories.map((s) => byId.get(s.id)).filter((a): a is Article => !!a),
      readingMetadata,
    );
  }
  const dailyProgress = useCallback(
    (article: Article, ratio: number) => {
      updateOfflineMetadata(article.id, { progress: ratio });
      setProgress((old) =>
        old[article.id] === ratio ? old : { ...old, [article.id]: ratio },
      );
    },
    [setProgress, updateOfflineMetadata],
  );
  function downloadBackup(text: string, name: string) {
    const blob = new Blob([text], { type: "application/json" });
    if (blob.size > 10_000_000)
      throw new Error(
        "The backup exceeds the 10 MB restore limit. Remove some saved stories and try again.",
      );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function exportLibrary() {
    try {
      downloadBackup(
        JSON.stringify(snapshotLibrary(), null, 2),
        "fylogia-library.json",
      );
    } catch (error) {
      setNotice((error as Error).message);
    }
  }
  async function exportEncryptedLibrary() {
    setBackupBusy(true);
    setNotice("");
    try {
      const encrypted = await encryptLibrary(snapshotLibrary(), backupPassword);
      downloadBackup(encrypted, "fylogia-library.encrypted.json");
      setBackupPassword("");
      setNotice(
        "Encrypted backup exported. Keep your password separately; it cannot be reset.",
      );
    } catch (error) {
      setNotice((error as Error).message || "Could not create a backup.");
    } finally {
      setBackupBusy(false);
    }
  }
  async function importLibrary(file?: File) {
    if (!file || backupBusy) return;
    setBackupBusy(true);
    setNotice("");
    try {
      if (file.size > 10_000_000)
        throw new Error("Backup exceeds the 10 MB restore limit.");
      const data = await decodeLibrary(await file.text(), backupPassword);
      await replaceLocalLibrary(data);
      for (const record of offline.items)
        offline.metadata(record.id, {
          bookmarked: data.saved.some((article) => article.id === record.id),
          progress: data.progress[record.id] || 0,
        });
      setBackupPassword("");
      setNotice("Library imported successfully.");
    } catch (error) {
      const message = (error as Error).message;
      setNotice(
        message.includes("backup") || message.includes("IndexedDB")
          ? message
          : "That file is not a valid Fylogia library export. No changes were made.",
      );
    } finally {
      setBackupBusy(false);
    }
  }
  if (!prefs.complete || personalizing)
    return (
      <>
        {profile.error && (
          <p className="notice" role="alert">
            {profile.error}
          </p>
        )}
        <button
          className="secondary onboarding-sync"
          onClick={() => setSyncOpen(true)}
        >
          Link an existing device
        </button>
        {syncPanel}
        <Onboarding
          onSourcesNeeded={() => setNewsRequested(true)}
          onArticles={(items) =>
            setCustom((old) => [
              ...items,
              ...old.filter((a) => !items.some((b) => b.id === a.id)),
            ])
          }
          initial={prefs}
          statuses={edition.statuses}
          onComplete={(p) => {
            setPrefs(p);
            setPersonalizing(false);
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        />
      </>
    );
  const current = navigation.find((n) => n.id === view)!;
  const storyView = ["home", "explore", "saved", "history"].includes(view);
  return (
    <>
      {syncPanel}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="mobile-header">
        <button
          className="icon-button"
          aria-label="Open navigation"
          onClick={() => setMenu(true)}
        >
          <Menu />
        </button>
        <span className="brand-lockup">
          <span className="brand-name">
            <BrandMark />
            <span className="wordmark">Fylogia</span>
          </span>
          {view === "home" && (
            <span className="brand-tagline">
              Your World, One Page at a Time.
            </span>
          )}
        </span>
        <button
          className="icon-button"
          aria-label="Search stories"
          onClick={() => navigate("explore")}
        >
          <Search size={21} />
        </button>
      </header>
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <div className="sidebar-brand">
          <span className="brand-lockup">
            <span className="brand-name">
              <BrandMark />
              <span className="wordmark">Fylogia</span>
            </span>
            {view === "home" && (
              <span className="brand-tagline">
                Your World, One Page at a Time.
              </span>
            )}
          </span>
          <button
            className="icon-button mobile-close"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              className={view === n.id ? "nav-item active" : "nav-item"}
              aria-current={view === n.id ? "page" : undefined}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} strokeWidth={1.6} />
              {n.label}
              {n.id === "saved" && saved.length > 0 ? (
                <small>{saved.length}</small>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p>A little more perspective.</p>
          <a
            href="https://github.com/Zainhomeautomation/Fylogia"
            target="_blank"
            rel="noreferrer"
          >
            Free & open source ↗
          </a>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-shade"
          onClick={() => setMenu(false)}
          aria-label="Close navigation overlay"
        />
      )}
      <main id="main" className="main">
        <div className="edition-bar">
          <span>
            {new Date().toLocaleDateString("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span>
            {online
              ? "Your personal edition"
              : `Offline · ${offline.items.length} downloads available`}
          </span>
        </div>
        <div className="page-heading">
          <h1>{view === "home" ? "Your daily perspective." : current.label}</h1>
          {storyView && (
            <button
              className="secondary refresh"
              aria-label="Refresh edition"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} className={busy ? "spinning" : ""} />
              <span>{busy ? "Refreshing…" : "Refresh"}</span>
            </button>
          )}
        </div>
        {(notice || prefsError || savedError || customError || dailyError) && (
          <p className="notice" role="status">
            {notice || prefsError || savedError || customError || dailyError}
          </p>
        )}
        {(offline.error || offline.message || offline.busy) && (
          <div className="download-notice" role="status">
            {offline.busy
              ? `Downloading ${Math.min(offline.batch.done + 1, offline.batch.total)} of ${offline.batch.total}…`
              : offline.error || offline.message}
            {offline.busy && (
              <progress
                aria-label="Download progress"
                max={offline.batch.total}
                value={offline.batch.done}
              />
            )}
          </div>
        )}
        {storyView && (
          <div
            className={`download-toolbar ${view === "home" ? "daily-edition" : ""}`}
          >
            {view === "home" && (
              <div className="edition-intro">
                <span className="eyebrow">Your personal daily magazine</span>
                <p>Today's Fylogia</p>
                <small>
                  {daily.stories.length} stories · A little time. A wider world.
                </small>
                <button
                  className="text-button"
                  disabled={!daily.stories.length}
                  onClick={() => setDailyOpen(rememberDaily(daily))}
                >
                  Open Today's Fylogia <ArrowRight size={16} />
                </button>
                {dailyEditions.some((e) => e.id !== daily.id) && (
                  <details className="daily-archive">
                    <summary>Previous editions</summary>
                    {dailyEditions
                      .filter((e) => e.id !== daily.id)
                      .map((e) => (
                        <button
                          className="text-button"
                          key={e.id}
                          onClick={() => setDailyOpen(e)}
                        >
                          {e.day} · {e.stories.length} stories
                        </button>
                      ))}
                  </details>
                )}
              </div>
            )}
            {view === "home" && (
              <button
                className="secondary"
                disabled={!online || offline.busy || !daily.stories.length}
                onClick={() => downloadDaily(daily)}
              >
                <Download size={16} />
                Download Daily Edition ({daily.stories.length}{" "}
                {daily.stories.length === 1 ? "story" : "stories"})
              </button>
            )}
            <button
              className="text-button"
              onClick={() => {
                setSelecting(!selecting);
                setSelectedIds([]);
              }}
            >
              {selecting ? "Done selecting" : "Select stories"}
            </button>
            {selecting && (
              <button
                className="secondary"
                disabled={!online || offline.busy || !selectedIds.length}
                onClick={() =>
                  void offline.download(
                    articles.filter((a) => selectedIds.includes(a.id)),
                    readingMetadata,
                  )
                }
              >
                Download selected ({selectedIds.length})
              </button>
            )}
          </div>
        )}
        {storyView ? (
          <>
            <div className="story-tools">
              <div className="filter-tabs" aria-label="Filter stories">
                {[
                  "All stories",
                  ...(view === "home" ? prefs.interests : categories),
                ].map((c) => (
                  <button
                    className={filter === c ? "selected" : ""}
                    key={c}
                    aria-pressed={filter === c}
                    onClick={() => setFilter(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="secondary readable-filter"
              aria-pressed={readableOnly}
              onClick={() => setReadableOnly(!readableOnly)}
            >
              Full articles only
            </button>
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Search stories"
                placeholder="Search stories, sources, ideas…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
            {busy && !all.length ? (
              <div className="empty" role="status">
                <BrandMark />
                <h2>Preparing your edition…</h2>
              </div>
            ) : !articles.length ? (
              <div className="empty">
                <BrandMark />
                <h2>
                  {query
                    ? "No stories found."
                    : view === "saved"
                      ? "Keep something worth returning to."
                      : view === "history"
                        ? "Your reading journey begins here."
                        : "A fresh perspective awaits."}
                </h2>
                <p>
                  {query
                    ? "Try another search or category."
                    : view === "saved"
                      ? "Tap the bookmark on a story to save it for later, including offline."
                      : view === "history"
                        ? "Open a story and it will appear here."
                        : "Follow sources that match your interests, or explore all available stories."}
                </p>
                <button
                  className="primary"
                  onClick={() =>
                    navigate(view === "home" ? "sources" : "explore")
                  }
                >
                  {view === "home" ? "Choose sources" : "Explore stories"}
                  <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="editorial-grid">
                  {articles.slice(0, 3).map((a, i) => (
                    <StoryCard
                      key={a.id}
                      article={a}
                      lead={i === 0}
                      saved={saved.some((s) => s.id === a.id)}
                      onDownload={() =>
                        void offline.download([a], readingMetadata)
                      }
                      downloaded={offline.items.some((r) => r.id === a.id)}
                      downloading={offline.working.includes(a.id)}
                      onSelect={
                        selecting
                          ? () =>
                              setSelectedIds((old) =>
                                old.includes(a.id)
                                  ? old.filter((id) => id !== a.id)
                                  : [...old, a.id],
                              )
                          : undefined
                      }
                      selected={selectedIds.includes(a.id)}
                      onSave={() => save(a)}
                      onOpen={() => open(a)}
                    />
                  ))}
                </div>
                {articles.length > 3 && (
                  <>
                    <div className="section-heading">
                      <h2>
                        {view === "saved"
                          ? "On your reading list"
                          : view === "history"
                            ? "Previously opened"
                            : "More to discover"}
                      </h2>
                      <span>{articles.length} stories</span>
                    </div>
                    <div className="story-grid">
                      {articles.slice(3, 75).map((a) => (
                        <StoryCard
                          key={a.id}
                          article={a}
                          saved={saved.some((s) => s.id === a.id)}
                          onDownload={() =>
                            void offline.download([a], readingMetadata)
                          }
                          downloaded={offline.items.some((r) => r.id === a.id)}
                          downloading={offline.working.includes(a.id)}
                          onSelect={
                            selecting
                              ? () =>
                                  setSelectedIds((old) =>
                                    old.includes(a.id)
                                      ? old.filter((id) => id !== a.id)
                                      : [...old, a.id],
                                  )
                              : undefined
                          }
                          selected={selectedIds.includes(a.id)}
                          onSave={() => save(a)}
                          onOpen={() => open(a)}
                        />
                      ))}
                    </div>
                    {articles.length > 75 && (
                      <p className="quiet">
                        Showing the first 75 stories. Filter by category or
                        search to find more.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
            {edition.generatedAt && (
              <p className="edition-note">
                Edition refreshed{" "}
                {new Date(edition.generatedAt).toLocaleString("en")}. Publisher
                feeds refresh every four hours; scheduled runs can be delayed.{" "}
                {edition.statuses.filter((s) => s.ok).length} of{" "}
                {edition.statuses.length} feeds available.
              </p>
            )}
          </>
        ) : null}
        {view === "sources" && (
          <Sources
            prefs={prefs}
            onPrefs={patch}
            onArticles={(items) =>
              setCustom((old) => [
                ...items,
                ...old.filter((a) => !items.some((b) => b.id === a.id)),
              ])
            }
            statuses={edition.statuses}
          />
        )}
        {view === "categories" && (
          <>
            <p className="section-intro">
              Follow your curiosity. Browse every subject in the current
              edition.
            </p>
            <div className="category-grid">
              {categories.map((c, i) => (
                <button
                  key={c}
                  onClick={() => {
                    setView("explore");
                    setFilter(c);
                  }}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <h2>{c}</h2>
                  <small>
                    {all.filter((a) => a.categories.includes(c)).length} stories{" "}
                    <ArrowRight size={15} />
                  </small>
                </button>
              ))}
            </div>
          </>
        )}
        {view === "offline" && (
          <OfflineLibrary
            library={offline}
            online={online}
            onOpen={open}
            onRefresh={(a) =>
              void offline.download(
                [all.find((item) => item.id === a.id) || a],
                readingMetadata,
                true,
              )
            }
          />
        )}
        {view === "magazines" && <Magazines onHome={() => navigate("home")} />}
        {view === "settings" && (
          <div className="settings">
            <section>
              <h2>Your devices</h2>
              <p>
                Read locally, or optionally link your private library across
                devices.
              </p>
              <button className="secondary" onClick={() => setSyncOpen(true)}>
                Sync my devices
              </button>
            </section>
            <section>
              <h2>Make yourself at home.</h2>
              <p>Choose how Fylogia looks and reads.</p>
              <h3>Appearance</h3>
              <div className="segmented appearance-options">
                {(["navy", "dark", "light", "system"] as const).map(
                  (theme, i) => {
                    const Icon = [Moon, Moon, Sun, Monitor][i];
                    const label = [
                      "Midnight Navy",
                      "Editorial Green",
                      "Light",
                      "System",
                    ][i];
                    return (
                      <button
                        className={prefs.theme === theme ? "selected" : ""}
                        aria-pressed={prefs.theme === theme}
                        key={theme}
                        onClick={() => patch({ theme })}
                      >
                        <Icon size={17} />
                        {label}
                      </button>
                    );
                  },
                )}
              </div>
              <h3>Default reading mode</h3>
              <div className="segmented">
                {(["pages", "scroll"] as const).map((reading) => (
                  <button
                    className={prefs.reading === reading ? "selected" : ""}
                    aria-pressed={prefs.reading === reading}
                    key={reading}
                    onClick={() => patch({ reading })}
                  >
                    {reading === "pages"
                      ? "Magazine pages"
                      : "Continuous scroll"}
                  </button>
                ))}
              </div>
              <label className="field">
                Reading size ({prefs.fontSize}px)
                <input
                  aria-label="Reading text size"
                  type="range"
                  min="16"
                  max="26"
                  value={prefs.fontSize}
                  onChange={(e) => patch({ fontSize: Number(e.target.value) })}
                />
              </label>
            </section>
            <section>
              <h2>Your perspective</h2>
              <p>{prefs.interests.join(" · ")}</p>
              <button
                className="secondary"
                onClick={() => {
                  setBackupPassword("");
                  setPersonalizing(true);
                }}
              >
                Edit interests & sources
              </button>
              <label className="field">
                Regional news
                <select
                  aria-label="Regional news"
                  value={prefs.region}
                  onChange={(e) => patch({ region: e.target.value })}
                >
                  {regions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <p className="quiet">
                Regional filters apply to For You. Follow matching regional
                sources in My Sources. Explore includes all regions.
              </p>
            </section>
            <section>
              <h2>Library management</h2>
              <p>
                No registration, email, or sign-in. Your library saves
                automatically on this device.
              </p>
              <p
                className="local-save-state"
                data-testid="local-save-state"
                aria-live="polite"
              >
                {profile.saving
                  ? "Saving on this device…"
                  : profile.durable
                    ? "Saved on this device"
                    : "Changes are only in this tab"}
              </p>
              {profile.recovered && (
                <p className="quiet">
                  Your library was recovered from its local IndexedDB copy.
                </p>
              )}
              <h3>Backup & recovery</h3>
              <p>
                Export a backup to recover this library or transfer it to
                another device. Import replaces preferences, sources, saved
                stories, daily editions, history, and progress, while keeping
                that device’s anonymous identity. Downloads and imported PDFs
                stay separate on each device.
              </p>
              <div className="form-row">
                <button
                  className="secondary"
                  onClick={exportLibrary}
                  disabled={backupBusy}
                >
                  <Download size={16} />
                  Export library
                </button>
                <label className="secondary file-button">
                  Import library
                  <input
                    type="file"
                    accept="application/json,.json"
                    disabled={backupBusy}
                    onChange={(e) => {
                      void importLibrary(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setHistory([]);
                  setNotice("Reading history cleared.");
                }}
              >
                Clear reading history
              </button>
            </section>
            <section>
              <h2>Offline reading</h2>
              <p>
                Download individual stories or your Daily Edition, then open
                Offline Library to read without a connection. Check your
                downloads before travelling.
              </p>
              <h2>Install Fylogia</h2>
              <p>
                On iPhone or iPad, open Fylogia in Safari, tap Share, then Add
                to Home Screen. On Mac, use Safari’s Add to Dock or your
                browser’s Install option.
              </p>
              <p>
                Downloaded stories and their stored images work offline after
                installation. Missing or excluded images are marked in Offline
                Library. Online PDFs need a connection; imported PDFs stay
                available locally.
              </p>
            </section>
            <section>
              <details className="advanced-settings">
                <summary>Advanced settings</summary>
                <h3>Private backups</h3>
                <p className="quiet">
                  An ordinary export contains private library data in readable
                  text. Use an encrypted backup when sharing or storing a copy
                  elsewhere.
                </p>
                <label className="field">
                  Backup password (optional)
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={backupPassword}
                    onChange={(event) => setBackupPassword(event.target.value)}
                    aria-label="Backup password"
                    disabled={backupBusy}
                  />
                </label>
                <button
                  className="secondary"
                  disabled={backupBusy}
                  onClick={() => void exportEncryptedLibrary()}
                >
                  {backupBusy ? "Working…" : "Export encrypted backup"}
                </button>
                <p className="quiet">
                  Use at least 12 characters. Enter the same password here
                  before importing an encrypted file. Keep it separately:
                  without the password, an encrypted backup cannot be recovered.
                  Passwords are never saved or sent to a server.
                </p>
                <p className="quiet">
                  Cloud sync is not enabled. Secure device pairing is planned
                  for the next phase. No private library data is uploaded.
                </p>
                <p>
                  iOS can remove website data when storage is low. Add Fylogia
                  to the Home Screen, keep free space, and recheck downloads
                  before Airplane Mode. Persistence is requested where supported
                  but is not guaranteed. If the entire origin is evicted, an
                  offline launch is impossible until you reconnect.
                </p>
                <h3>Content and downloads</h3>
                <p>
                  {" "}
                  Use Download on a story or Download Daily Edition for up to 30
                  stories from Today’s Fylogia. Check Offline Library before
                  travelling. Only publisher-supplied text is saved; most
                  publishers supply previews. Images are cached only under the
                  configured NASA informational-use policy, excluding APOD and
                  marked copyrighted material.
                </p>
                <h3>Summaries & content</h3>
                <p>
                  Summarize uses your browser’s on-device AI when supported.
                  Otherwise Fylogia clearly labels locally extracted key
                  passages. No API key or payment is required.
                </p>
                <p>
                  Most publishers supply a preview. NASA and licensed Global
                  Voices feed articles are available in full when supplied. Full
                  stories, image credits, and publisher access conditions remain
                  at the original source. Fylogia never bypasses paywalls.
                </p>
                <a
                  href="https://github.com/Zainhomeautomation/Fylogia"
                  target="_blank"
                  rel="noreferrer"
                >
                  Fylogia on GitHub · MIT License ↗
                </a>
              </details>
            </section>
          </div>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Quick navigation">
        {navigation
          .filter((n) =>
            ["home", "explore", "saved", "settings"].includes(n.id),
          )
          .map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              className={view === n.id ? "active" : ""}
              aria-current={view === n.id ? "page" : undefined}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={21} />
              <span>
                {n.id === "home"
                  ? "For You"
                  : n.id === "saved"
                    ? "Saved"
                    : n.label}
              </span>
            </button>
          ))}
      </nav>
      {dailyOpen && (
        <DailyMagazine
          downloadNotice={offline.error || offline.message}
          edition={dailyOpen}
          articles={dailyArticles}
          prefs={prefs}
          progress={progress}
          savedIds={saved.map((a) => a.id)}
          downloadedIds={offline.items.map((r) => r.id)}
          downloadingIds={offline.working}
          online={online}
          busy={offline.busy}
          onProgress={dailyProgress}
          onOpen={recordVisit}
          onSave={save}
          onPrefs={patch}
          onDownload={(stories) => {
            void offline.download(stories, readingMetadata);
          }}
          onClose={() => setDailyOpen(undefined)}
          onHome={() => {
            setDailyOpen(undefined);
            navigate("home");
          }}
        />
      )}
      {displayedReader && (
        <Reader
          downloadNotice={offline.error || offline.message}
          article={displayedReader}
          prefs={prefs}
          saved={saved.some((a) => a.id === displayedReader.id)}
          initialProgress={progress[displayedReader.id] || 0}
          onDownload={() =>
            void offline.download(
              [all.find((a) => a.id === displayedReader.id) || displayedReader],
              readingMetadata,
            )
          }
          downloaded={offline.items.some((r) => r.id === displayedReader.id)}
          downloading={offline.working.includes(displayedReader.id)}
          offlineLabel={
            offline.items.some((r) => r.id === displayedReader.id)
              ? "Offline copy stored on this device. Missing or excluded publisher images may be omitted."
              : undefined
          }
          onSave={() => save(displayedReader)}
          onPrefs={patch}
          onProgress={onProgress}
          onHome={() => {
            setReader(undefined);
            navigate("home");
          }}
          onClose={() => setReader(undefined)}
        />
      )}
    </>
  );
}

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
  categories,
  regions,
  type Article,
  type Edition,
  type Preferences,
} from "./catalog";
import { useStored } from "./storage";
import { Onboarding } from "./Onboarding";
import { StoryCard } from "./StoryCard";
import { Reader } from "./Reader";
import { Sources } from "./Sources";
import { Magazines } from "./Magazines";
import { loadCustom } from "./feeds";
import { useOfflineLibrary } from "./useOfflineLibrary";
import { OfflineLibrary } from "./OfflineLibrary";
import "./App.css";
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
  const [custom, setCustom, customError] = useStored<Article[]>("custom", []);
  const [edition, setEdition] = useState<Edition>(EMPTY),
    [view, setView] = useState("home"),
    [filter, setFilter] = useState("All stories"),
    [query, setQuery] = useState(""),
    [reader, setReader] = useState<Article>(),
    [busy, setBusy] = useState(true),
    [notice, setNotice] = useState(""),
    [menu, setMenu] = useState(false),
    [personalizing, setPersonalizing] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const offline = useOfflineLibrary();
  const {
    ready: offlineReady,
    refreshText,
    metadata: updateOfflineMetadata,
  } = offline;
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
    setBusy(true);
    try {
      const res = await fetch(
        import.meta.env.BASE_URL + "data/edition.json?t=" + Date.now(),
        { cache: "no-cache" },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!Array.isArray(data.articles) || !data.articles.length)
        throw new Error();
      setEdition(data);
      setNotice("");
    } catch {
      setNotice(
        "Could not refresh. Your cached edition and saved articles remain available.",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refresh]);
  useEffect(() => {
    const on = () => {
        setOnline(true);
        void refresh();
      },
      off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refresh]);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        prefs.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : prefs.theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [prefs.theme]);
  useEffect(() => {
    if (!prefs.customSources.length || !prefs.complete) return;
    let active = true;
    Promise.allSettled(
      prefs.customSources.map((s) => loadCustom(s, prefs.converter)),
    ).then((results) => {
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
    });
    return () => {
      active = false;
    };
  }, [prefs.complete, prefs.customSources, prefs.converter, setCustom]);
  function navigate(id: string) {
    setView(id);
    setFilter("All stories");
    setQuery("");
    setMenu(false);
    setSelecting(false);
    setSelectedIds([]);
    window.scrollTo(0, 0);
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
  function open(article: Article) {
    const copy = offline.items.find((r) => r.id === article.id);
    setReader(copy && (!online || view === "offline") ? copy.article : article);
    setHistory((old) =>
      [article, ...old.filter((a) => a.id !== article.id)].slice(0, 150),
    );
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
  const articles = useMemo(() => {
    let result = view === "saved" ? saved : view === "history" ? history : all;
    if (view === "home")
      result = result.filter(
        (a) =>
          prefs.sourceIds.includes(a.sourceId) &&
          (prefs.region === "Worldwide" ||
            a.region === prefs.region ||
            (a.region === "Worldwide" && !a.categories.includes("World News"))),
      );
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
          (n, t) =>
            n + (a.title.toLowerCase().includes(t.toLowerCase()) ? 3 : 0),
          0,
        ) + (a.image ? 1 : 0);
      result = [...result].sort(
        (a, b) =>
          score(b) - score(a) ||
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
    filter,
    query,
  ]);
  function exportLibrary() {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, preferences: prefs, saved, history, progress, custom },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fylogia-library.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importLibrary(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10_000_000) throw new Error();
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !data.preferences || !Array.isArray(data.saved))
        throw new Error();
      const p = data.preferences;
      if (
        !Array.isArray(p.interests) ||
        !p.interests.every((v: unknown) => typeof v === "string") ||
        !Array.isArray(p.sourceIds) ||
        !p.sourceIds.every((v: unknown) => typeof v === "string") ||
        !Array.isArray(p.customSources) ||
        p.customSources.some(
          (s: any) =>
            !s.id ||
            !s.name ||
            !Array.isArray(s.categories) ||
            !/^https:\/\//.test(s.url),
        ) ||
        !["system", "light", "dark"].includes(p.theme)
      )
        throw new Error();
      const valid = (a: any) =>
        typeof a.id === "string" &&
        typeof a.title === "string" &&
        typeof a.source === "string" &&
        typeof a.content === "string" &&
        typeof a.excerpt === "string" &&
        Array.isArray(a.categories) &&
        /^https?:\/\//.test(a.url);
      if (
        !data.saved.every(valid) ||
        !Array.isArray(data.history) ||
        !data.history.every(valid) ||
        !Array.isArray(data.custom) ||
        !data.custom.every(valid)
      )
        throw new Error();
      setPrefs({
        ...defaults,
        ...p,
        fontSize: Math.min(26, Math.max(16, Number(p.fontSize) || 19)),
        topics: Array.isArray(p.topics) ? p.topics : [],
        reading: p.reading === "scroll" ? "scroll" : "pages",
        complete: true,
      });
      setSaved(data.saved);
      setHistory(data.history.slice(0, 150));
      setCustom(data.custom);
      const importedProgress = Object.fromEntries(
        Object.entries(data.progress || {}).filter(
          (entry): entry is [string, number] =>
            typeof entry[1] === "number" &&
            Number.isFinite(entry[1]) &&
            entry[1] >= 0 &&
            entry[1] <= 1,
        ),
      );
      setProgress(importedProgress);
      for (const record of offline.items)
        offline.metadata(record.id, {
          bookmarked: data.saved.some((a: Article) => a.id === record.id),
          progress: importedProgress[record.id] || 0,
        });
      setNotice("Library imported successfully.");
    } catch {
      setNotice(
        "That file is not a valid Fylogia library export. No changes were made.",
      );
    }
  }
  if (!prefs.complete || personalizing)
    return (
      <Onboarding
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
        }}
      />
    );
  const current = navigation.find((n) => n.id === view)!;
  const storyView = ["home", "explore", "saved", "history"].includes(view);
  return (
    <>
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
        <span className="wordmark">Fylogia</span>
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
          <span className="wordmark">Fylogia</span>
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
        {(notice || prefsError || savedError || customError) && (
          <p className="notice" role="status">
            {notice || prefsError || savedError || customError}
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
          <div className="download-toolbar">
            {view === "home" && (
              <button
                className="secondary"
                disabled={!online || offline.busy || !articles.length}
                onClick={() =>
                  void offline.download(articles.slice(0, 30), readingMetadata)
                }
              >
                <Download size={16} />
                Download Daily Edition ({Math.min(30, articles.length)} stories)
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
                <RefreshCw className="spinning" />
                <h2>Preparing your edition…</h2>
              </div>
            ) : !articles.length ? (
              <div className="empty">
                <BookOpen size={36} strokeWidth={1} />
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
                feeds refresh hourly; scheduled runs can be delayed.{" "}
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
        {view === "magazines" && <Magazines />}
        {view === "settings" && (
          <div className="settings">
            <section>
              <h2>Make yourself at home.</h2>
              <p>Choose how Fylogia looks and reads.</p>
              <h3>Appearance</h3>
              <div className="segmented">
                {(["light", "dark", "system"] as const).map((theme, i) => {
                  const Icon = [Sun, Moon, Monitor][i];
                  return (
                    <button
                      className={prefs.theme === theme ? "selected" : ""}
                      aria-pressed={prefs.theme === theme}
                      key={theme}
                      onClick={() => patch({ theme })}
                    >
                      <Icon size={17} />
                      {theme}
                    </button>
                  );
                })}
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
                onClick={() => setPersonalizing(true)}
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
              <h2>Your library, on your terms.</h2>
              <p>
                Preferences, bookmarks, and history stay on this browser. Export
                your library to transfer it to another device. Imported PDFs are
                stored separately on each device.
              </p>
              <div className="form-row">
                <button className="secondary" onClick={exportLibrary}>
                  <Download size={16} />
                  Export library
                </button>
                <label className="secondary file-button">
                  Import library
                  <input
                    type="file"
                    accept="application/json,.json"
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
                Use Download on a story or Download Daily Edition for up to 30
                stories from the current For You selection. Check Offline
                Library before travelling. Only publisher-supplied text is
                saved; most publishers supply previews. Images are cached only
                under the configured NASA informational-use policy, excluding
                APOD and marked copyrighted material.
              </p>
              <p>
                iOS can remove website data when storage is low. Add Fylogia to
                the Home Screen, keep free space, and recheck downloads before
                Airplane Mode. Persistence is requested where supported but is
                not guaranteed. If the entire origin is evicted, an offline
                launch is impossible until you reconnect.
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
              <h2>Summaries & content</h2>
              <p>
                Summarize uses your browser’s on-device AI when supported.
                Otherwise Fylogia clearly labels locally extracted key passages.
                No API key or payment is required.
              </p>
              <p>
                Most publishers supply a preview. NASA feed articles are
                available in full when supplied. Full stories, image credits,
                and publisher access conditions remain at the original source.
                Fylogia never bypasses paywalls.
              </p>
              <a
                href="https://github.com/Zainhomeautomation/Fylogia"
                target="_blank"
                rel="noreferrer"
              >
                Fylogia on GitHub · MIT License ↗
              </a>
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
      {reader && (
        <Reader
          article={reader}
          prefs={prefs}
          saved={saved.some((a) => a.id === reader.id)}
          initialProgress={progress[reader.id] || 0}
          onDownload={() =>
            void offline.download(
              [all.find((a) => a.id === reader.id) || reader],
              readingMetadata,
            )
          }
          downloaded={offline.items.some((r) => r.id === reader.id)}
          downloading={offline.working.includes(reader.id)}
          offlineLabel={
            offline.items.some((r) => r.id === reader.id)
              ? "Offline copy stored on this device. Missing or excluded publisher images may be omitted."
              : undefined
          }
          onSave={() => save(reader)}
          onPrefs={patch}
          onProgress={onProgress}
          onClose={() => setReader(undefined)}
        />
      )}
    </>
  );
}

import {
  recommendSources,
  sourceMatches,
  canonicalStoryUrl,
} from "./source-utils";
import { useState } from "react";
import { Plus, ExternalLink, Rss } from "lucide-react";
import {
  sources,
  categories,
  regions,
  type Preferences,
  type Source,
  type Article,
  type FeedStatus,
} from "./catalog";
import { safeUrl } from "./storage";
export function Sources({
  prefs,
  onPrefs,
  onArticles,
  statuses,
  customOnly = false,
}: {
  customOnly?: boolean;
  prefs: Preferences;
  onPrefs: (p: Partial<Preferences>) => void;
  onArticles: (a: Article[]) => void;
  statuses: FeedStatus[];
}) {
  const [url, setUrl] = useState(""),
    [name, setName] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All categories"),
    [region, setRegion] = useState("All regions"),
    [content, setContent] = useState("All content"),
    [group, setGroup] = useState("All sources"),
    [visible, setVisible] = useState(30);
  const all = [...sources, ...prefs.customSources];
  const recommendations = recommendSources(all, prefs, statuses, 20);
  const filtered = all
    .filter(
      (s) =>
        sourceMatches(s, query, category, region, content) &&
        (group === "Following"
          ? prefs.sourceIds.includes(s.id)
          : group === "Recommended"
            ? recommendations.some((r) => r.id === s.id)
            : true),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  function toggle(id: string) {
    onPrefs({
      sourceIds: prefs.sourceIds.includes(id)
        ? prefs.sourceIds.filter((x) => x !== id)
        : [...prefs.sourceIds, id],
    });
  }
  function createSource(): Source {
    const safe = safeUrl(url);
    if (
      !safe ||
      !safe.startsWith("https:") ||
      new URL(safe).username ||
      new URL(safe).password
    )
      throw new Error("Enter a valid public HTTPS feed URL.");
    if (all.some((s) => canonicalStoryUrl(s.url) === canonicalStoryUrl(safe)))
      throw new Error("This feed is already in your sources.");
    return {
      id: "custom-" + crypto.randomUUID(),
      name: name.trim() || new URL(safe).hostname,
      url: safe,
      site: new URL(safe).origin,
      categories: [prefs.interests[0] || "Technology"],
      region: "Worldwide",
      custom: true,
    };
  }
  function commit(source: Source, articles: Article[]) {
    onPrefs({
      customSources: [...prefs.customSources, source],
      sourceIds: [...prefs.sourceIds, source.id],
    });
    onArticles(articles);
    setUrl("");
    setName("");
    setMessage(`Added ${source.name} with ${articles.length} articles.`);
  }
  async function add() {
    setBusy(true);
    setMessage("");
    try {
      const source = createSource();
      const { loadCustom } = await import("./feeds");
      const articles = await loadCustom(source, prefs.converter);
      commit(source, articles);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const source = createSource();
      const { parseFeedFile } = await import("./feeds");
      commit(source, parseFeedFile(await file.text(), source));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!customOnly && (
        <>
          <div className="section-intro">
            <p>
              A considered collection of voices. Follow the sources you want in
              your daily edition.
            </p>
          </div>
          <div className="source-directory-tools">
            <label className="field">
              Search sources
              <input
                aria-label="Search sources"
                placeholder="Publisher, topic or region"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisible(30);
                }}
              />
            </label>
            <div className="source-directory-filters">
              <label className="field">
                Category
                <select
                  aria-label="Source category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setVisible(30);
                  }}
                >
                  {["All categories", ...categories].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Region
                <select
                  aria-label="Source region"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setVisible(30);
                  }}
                >
                  {["All regions", ...regions].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Reading
                <select
                  aria-label="Source content"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setVisible(30);
                  }}
                >
                  {["All content", "Full text capable", "Preview only"].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <div className="segmented">
              {["All sources", "Recommended", "Following"].map((g) => (
                <button
                  key={g}
                  aria-pressed={group === g}
                  className={group === g ? "selected" : ""}
                  onClick={() => {
                    setGroup(g);
                    setVisible(30);
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="quiet" role="status">
              {filtered.length} matching sources · {sources.length} curated
              feeds. Original publisher access may vary.
            </p>
          </div>
          <div className="source-list">
            {filtered.slice(0, visible).map((s) => {
              const status = statuses.find((x) => x.id === s.id);
              return (
                <div className="source-row" key={s.id}>
                  <div className="source-monogram">{s.name[0]}</div>
                  <div className="source-info">
                    <strong>{s.name}</strong>
                    <p>
                      {s.categories.join(" · ")}
                      {s.region !== "Worldwide" ? " · " + s.region : ""}
                    </p>
                    <span
                      className={`source-content-label ${s.full ? "complete" : "preview"}`}
                    >
                      {s.full
                        ? "Full text where authorized"
                        : "Publisher previews"}
                    </span>
                    {recommendations.some((r) => r.id === s.id) && (
                      <span className="source-recommendation">
                        Recommended for your interests
                      </span>
                    )}
                    <small>
                      {s.custom
                        ? "Custom RSS/Atom feed"
                        : status?.ok
                          ? `${status.count} articles · ${status.fullCount !== undefined ? status.fullCount + " full text · " : ""}Feed available`
                          : status
                            ? "Feed unavailable · retrying next refresh"
                            : "Checking feed"}
                    </small>
                    {status?.latestPublished && (
                      <small>
                        Latest story{" "}
                        {new Date(status.latestPublished).toLocaleDateString(
                          "en",
                        )}{" "}
                        ·{" "}
                        {status.freshness === "stale"
                          ? "Stale feed"
                          : status.freshness === "aging"
                            ? "Infrequent updates"
                            : "Recently updated"}
                      </small>
                    )}
                    {status && (
                      <small
                        title={new Date(status.checked).toLocaleString("en")}
                      >
                        {status.ok ? "Last checked" : "Last attempted"}{" "}
                        {new Date(status.checked).toLocaleDateString("en")}
                        {!status.ok && status.retainedCount
                          ? ` · ${status.retainedCount} retained stories`
                          : ""}
                      </small>
                    )}
                    {s.permissionUrl && (
                      <a
                        className="source-permission"
                        href={s.permissionUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {s.licenseLabel || "Reuse policy"}
                      </a>
                    )}
                  </div>
                  <a
                    className="icon-button"
                    href={s.site}
                    rel="noreferrer"
                    target="_blank"
                    aria-label={`Visit ${s.name}`}
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    className={
                      prefs.sourceIds.includes(s.id) ? "secondary" : "primary"
                    }
                    aria-pressed={prefs.sourceIds.includes(s.id)}
                    onClick={() => toggle(s.id)}
                  >
                    {prefs.sourceIds.includes(s.id) ? "Following" : "Follow"}
                  </button>
                  {s.custom && (
                    <button
                      className="text-button"
                      onClick={() =>
                        onPrefs({
                          customSources: prefs.customSources.filter(
                            (x) => x.id !== s.id,
                          ),
                          sourceIds: prefs.sourceIds.filter((x) => x !== s.id),
                        })
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p>
              No sources match these filters. Try another topic or add a custom
              feed below.
            </p>
          )}
          {filtered.length > visible && (
            <button
              className="secondary"
              onClick={() => setVisible((n) => n + 30)}
            >
              Show 30 more sources
            </button>
          )}
        </>
      )}
      <section className="custom-feed">
        <Rss size={24} />
        <h2>Bring your own sources.</h2>
        <p>
          Add a public RSS or Atom URL. Direct access depends on the publisher’s
          browser permissions.
        </p>
        <div className="form-row">
          <label className="field">
            Source name{" "}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A favorite publication"
              maxLength={100}
            />
          </label>
          <label className="field">
            Feed URL{" "}
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed/"
            />
          </label>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={prefs.converter}
            onChange={(e) => onPrefs({ converter: e.target.checked })}
          />{" "}
          Use rss2json if direct access fails
        </label>
        <p className="quiet">
          Optional third-party service: the feed URL is sent to rss2json.com.
          Free service limits and availability apply. Never enter private or
          authenticated feeds.
        </p>
        <div className="form-row">
          <button className="primary" disabled={busy || !url} onClick={add}>
            <Plus size={16} />
            {busy ? "Loading…" : "Add source"}
          </button>
          <label className="secondary file-button">
            Import RSS/Atom file
            <input
              type="file"
              accept=".xml,.rss,.atom,application/xml,text/xml"
              disabled={busy || !url}
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p role="status">{message}</p>
      </section>
    </>
  );
}

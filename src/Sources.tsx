import { useState } from "react";
import { Plus, ExternalLink, Rss } from "lucide-react";
import {
  sources,
  type Preferences,
  type Source,
  type Article,
  type FeedStatus,
} from "./catalog";
import { loadCustom, parseFeedFile } from "./feeds";
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
    [busy, setBusy] = useState(false);
  const all = [...sources, ...prefs.customSources];
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
    if (all.some((s) => s.url === safe))
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
          <div className="source-list">
            {all.map((s) => {
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
                    <small>
                      {s.custom
                        ? "Custom RSS/Atom feed"
                        : status?.ok
                          ? `${status.count} articles · Feed available`
                          : status
                            ? "Feed unavailable · retrying next refresh"
                            : "Checking feed"}
                    </small>
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

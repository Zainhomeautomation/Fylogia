import { SportsNavigation } from "./SportsNavigation";
import { sportsPublications } from "./sports-publications";
import {
  primarySports,
  sourceSports,
  type SportSelection,
} from "./sports-taxonomy";
import { lazy, Suspense, useEffect, useState } from "react";
import { BookOpen, Upload, ExternalLink, Trash2 } from "lucide-react";
import { normalizeInterestSearch } from "./interest-taxonomy";
import { categories, sources } from "./catalog";
const PdfReader = lazy(() => import("./PdfReader"));
interface Magazine {
  id: string;
  title: string;
  url?: string;
  file?: ArrayBuffer;
  cover?: string;
  description: string;
  categories?: string[];
  publisher?: string;
  original?: string;
  issue?: string;
}
const editions: Magazine[] = [
  {
    id: "nasa-spinoff-2025",
    publisher: "NASA",
    categories: ["Science", "Space", "Engineering"],
    issue: "2025 annual edition",
    original: "https://spinoff.nasa.gov/",
    title: "NASA Spinoff 2025",
    cover: import.meta.env.BASE_URL + "covers/nasa-spinoff-2025.jpg",
    url: import.meta.env.BASE_URL + "editions/nasa-spinoff-2025.pdf",
    description:
      "NASA’s annual publication on space technology improving life on Earth. Original PDF, provided by NASA.",
  },
  {
    id: "hackspace-75",
    cover: import.meta.env.BASE_URL + "covers/hackspace-75.jpg",
    title: "HackSpace 75",
    publisher: "Raspberry Pi Ltd",
    issue: "February 2024 · Issue 75",
    categories: [
      "Technology",
      "Computing",
      "3D Printing",
      "Engineering",
      "Photography",
    ],
    url: import.meta.env.BASE_URL + "editions/hackspace-75.pdf",
    original: "https://magazine.raspberrypi.com/hackspace/issues/75",
    description:
      "Original 100-page issue · CC BY-NC-SA 3.0 except where noted. Electronics, making, photography, and 3D printing. Online PDF (64 MB); publisher credits and exceptions preserved.",
  },
];
function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    // Keep the original database name to preserve imported PDFs.
    const req = indexedDB.open("folio-magazines", 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("pdfs", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function records(
  action: "list" | "put" | "delete",
  value?: Magazine | string,
) {
  const database = await db();
  try {
    return await new Promise<Magazine[]>((resolve, reject) => {
      const tx = database.transaction(
        "pdfs",
        action === "list" ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("pdfs");
      const req =
        action === "list"
          ? store.getAll()
          : action === "put"
            ? store.put(value)
            : store.delete(value as string);
      tx.oncomplete = () =>
        resolve(action === "list" ? (req.result as Magazine[]) : []);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    database.close();
  }
}
export function Magazines({
  onHome,
  initialCategory = "All categories",
  initialSport = "all",
  onBrowseSource,
}: {
  onHome: () => void;
  initialCategory?: string;
  initialSport?: SportSelection;
  onBrowseSource: (id: string, sport?: SportSelection) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sport, setSport] = useState<SportSelection>(initialSport);
  const matches = (m: {
    title?: string;
    name?: string;
    categories?: string[];
  }) =>
    (category === "All categories" || m.categories?.includes(category)) &&
    normalizeInterestSearch(
      `${m.title || m.name} ${(m.categories || []).join(" ")}`,
    ).includes(normalizeInterestSearch(query.trim()));
  const directory = [
    ...sources.map((source) => ({
      ...source,
      articleSourceId: source.id,
      sportIds:
        sportsPublications.find(
          (p) => p.id === source.id || p.feedId === source.id,
        )?.sports || sourceSports(source),
    })),
    ...sportsPublications
      .filter((p) => !sources.some((s) => s.id === p.id || s.id === p.feedId))
      .map((p) => ({
        ...p,
        categories: ["Sports"],
        full: false,
        articleSourceId: undefined,
        sportIds: p.sports,
      })),
  ];
  const publications = directory.filter(
    (source) =>
      matches(source) &&
      (category !== "Sports" ||
        sport === "all" ||
        (sport === "other"
          ? !source.sportIds.some((id) =>
              primarySports.some((s) => s.id === id),
            )
          : source.sportIds.includes(sport))),
  );
  const [publicationLimit, setPublicationLimit] = useState(24);
  const [local, setLocal] = useState<Magazine[]>([]),
    [active, setActive] = useState<{
      id: string;
      url: string;
      title: string;
    }>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    records("list")
      .then(setLocal)
      .catch(() =>
        setError(
          "Local PDF storage is unavailable in this browser. Online editions still work.",
        ),
      );
  }, []);
  useEffect(
    () => () => {
      if (active?.url.startsWith("blob:")) URL.revokeObjectURL(active.url);
    },
    [active],
  );
  async function add(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      if (file.size > 50 * 1024 * 1024)
        throw new Error("Please choose a PDF smaller than 50 MB.");
      const data = await file.arrayBuffer();
      if (!new TextDecoder().decode(data.slice(0, 5)).startsWith("%PDF-"))
        throw new Error("Please choose a valid PDF file.");
      let cover: string | undefined;
      try {
        cover = await (await import("./pdf-cover")).createPdfCover(data);
      } catch {
        /* A cover is optional; the original PDF remains available. */
      }
      await records("put", {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.pdf$/i, ""),
        file: data,
        cover,
        description: "Your private PDF · saved in this browser",
      });
      setLocal(await records("list"));
      setError("");
    } catch (e) {
      setError(
        (e as Error).message ||
          "Could not store this PDF. Browser storage is unavailable or full.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="section-intro">
        Original pages, unhurried reading. Explore a freely available
        publication or bring a PDF you have permission to read.
      </p>
      <div className="magazine-filters">
        <label>
          Find a publication{" "}
          <input
            aria-label="Find a publication"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPublicationLimit(24);
            }}
            placeholder="Title or subject"
          />
        </label>
        <label>
          Category{" "}
          <select
            aria-label="Magazine category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPublicationLimit(24);
            }}
          >
            <option>All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <h2>Complete editions & your PDFs</h2>
      <label className="secondary file-button">
        <Upload size={17} />
        {busy ? "Saving PDF…" : "Import a PDF"}
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={async (e) => {
            const input = e.currentTarget;
            await add(input.files?.[0]);
            input.value = "";
          }}
        />
      </label>
      <p className="quiet">
        Imported PDFs stay on this device. Up to 50 MB each. No upload to a
        server.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="magazine-grid">
        {[...editions, ...local].filter(matches).map((m, i) => (
          <article className="magazine" key={m.id} data-magazine-id={m.id}>
            <button
              aria-label={`Open ${m.title}`}
              className={
                "magazine-cover cover-" +
                (i % 3) +
                (m.cover ? " has-original-cover" : "")
              }
              onClick={() =>
                setActive({
                  id: m.id,
                  title: m.title,
                  url:
                    m.url ||
                    URL.createObjectURL(
                      new Blob([m.file!], { type: "application/pdf" }),
                    ),
                })
              }
            >
              {m.cover && (
                <img
                  src={m.cover}
                  alt={`${m.title} — original publication cover`}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <span>{m.publisher || "YOUR LIBRARY"}</span>
              <BookOpen size={70} strokeWidth={0.8} />
              <h2>{m.title}</h2>
              <span>Open edition ↗</span>
            </button>
            {m.issue && <p className="quiet">{m.issue}</p>}
            <p>{m.description}</p>
            {m.url ? (
              <a
                className="text-button"
                href={
                  m.id === "nasa-spinoff-2025"
                    ? "https://ntts-prod.s3.amazonaws.com/t2p/prod/spinoff/NASA.Spinoff_2025_508.pdf"
                    : m.original || m.url
                }
                target="_blank"
                rel="noreferrer"
              >
                Original publication
                <ExternalLink size={14} />
              </a>
            ) : (
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await records("delete", m.id);
                    setLocal(await records("list"));
                  } catch {
                    setError("Could not remove this PDF.");
                  }
                }}
              >
                <Trash2 size={14} />
                Remove PDF
              </button>
            )}
          </article>
        ))}
      </div>
      {![...editions, ...local].some(matches) && (
        <p className="quiet">
          No complete editions in this selection. Browse official publications
          below, or import a PDF you have permission to read.
        </p>
      )}
      {category === "Sports" && (
        <SportsNavigation value={sport} onChange={setSport} />
      )}
      <section className="publication-directory">
        <h2>Publications & articles</h2>
        <p className="quiet">
          Read publisher-provided articles and previews. RSS articles are not
          complete magazine issues. Official sites offer their own editions and
          subscriptions.
        </p>
        {publications.slice(0, publicationLimit).map((source) => (
          <article
            className="publication-card"
            key={source.id}
            data-publication-id={source.id}
          >
            <h3>{source.name}</h3>
            <p className="quiet">
              {source.categories.join(" · ")} ·{" "}
              {source.articleSourceId
                ? source.full
                  ? "Permitted full articles"
                  : "Publisher previews"
                : "Official publisher · Editions on publisher’s site"}
            </p>
            {source.articleSourceId && (
              <button
                className="text-button"
                onClick={() =>
                  onBrowseSource(
                    source.articleSourceId!,
                    category === "Sports" ? sport : undefined,
                  )
                }
              >
                Browse articles
              </button>
            )}
            <a
              className="text-button"
              href={source.site}
              target="_blank"
              rel="noreferrer"
            >
              Official publication <ExternalLink size={14} />
            </a>
          </article>
        ))}
        {publications.length > publicationLimit && (
          <button
            className="secondary"
            onClick={() => setPublicationLimit((limit) => limit + 24)}
          >
            Show more publications ({publications.length - publicationLimit}{" "}
            remaining)
          </button>
        )}
        {!publications.length && (
          <p>
            No matching publications. Try another category or visit My Sources
            for the complete source directory.
          </p>
        )}
      </section>
      {active && (
        <Suspense fallback={<div className="loading">Opening magazine…</div>}>
          <PdfReader
            id={active.id}
            url={active.url}
            title={active.title}
            onCover={
              local.some((m) => m.id === active.id && !m.cover)
                ? async (cover) => {
                    const magazine = local.find((m) => m.id === active.id);
                    if (!magazine) return;
                    try {
                      await records("put", { ...magazine, cover });
                      setLocal((previous) =>
                        previous.map((m) =>
                          m.id === magazine.id ? { ...m, cover } : m,
                        ),
                      );
                    } catch {
                      /* The original PDF remains available when thumbnail storage is full. */
                    }
                  }
                : undefined
            }
            onHome={() => {
              setActive(undefined);
              onHome();
            }}
            onClose={() => setActive(undefined)}
          />
        </Suspense>
      )}
    </>
  );
}

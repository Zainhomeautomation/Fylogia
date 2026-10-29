import { lazy, Suspense, useEffect, useState } from "react";
import { BookOpen, Upload, ExternalLink, Trash2 } from "lucide-react";
const PdfReader = lazy(() => import("./PdfReader"));
interface Magazine {
  id: string;
  title: string;
  url?: string;
  file?: ArrayBuffer;
  description: string;
}
const editions: Magazine[] = [
  {
    id: "nasa-spinoff-2025",
    title: "NASA Spinoff 2025",
    url: import.meta.env.BASE_URL + "editions/nasa-spinoff-2025.pdf",
    description:
      "NASA’s annual publication on space technology improving life on Earth. Original PDF, provided by NASA.",
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
export function Magazines() {
  const [local, setLocal] = useState<Magazine[]>([]),
    [active, setActive] = useState<{ url: string; title: string }>(),
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
      await records("put", {
        id: crypto.randomUUID(),
        title: file.name.replace(/\.pdf$/i, ""),
        file: data,
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
        {[...editions, ...local].map((m, i) => (
          <article className="magazine" key={m.id}>
            <button
              className={"magazine-cover cover-" + (i % 3)}
              onClick={() =>
                setActive({
                  title: m.title,
                  url:
                    m.url ||
                    URL.createObjectURL(
                      new Blob([m.file!], { type: "application/pdf" }),
                    ),
                })
              }
            >
              <span>{m.url ? "NASA" : "YOUR LIBRARY"}</span>
              <BookOpen size={70} strokeWidth={0.8} />
              <h2>{m.title}</h2>
              <span>Open edition ↗</span>
            </button>
            <p>{m.description}</p>
            {m.url ? (
              <a
                className="text-button"
                href={
                  m.id === "nasa-spinoff-2025"
                    ? "https://ntts-prod.s3.amazonaws.com/t2p/prod/spinoff/NASA.Spinoff_2025_508.pdf"
                    : m.url
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
      {active && (
        <Suspense fallback={<div className="loading">Opening magazine…</div>}>
          <PdfReader
            url={active.url}
            title={active.title}
            onClose={() => setActive(undefined)}
          />
        </Suspense>
      )}
    </>
  );
}

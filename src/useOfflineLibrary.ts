import { useCallback, useEffect, useRef, useState } from "react";
import type { Article } from "./catalog";
import {
  auditDownloads,
  deleteDownload,
  downloadArticle,
  refreshDownloadText,
  updateReading,
  type DownloadedArticle,
  type ReadingMetadata,
} from "./offline-store";
export function useOfflineLibrary() {
  const [items, setItems] = useState<DownloadedArticle[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [working, setWorking] = useState<string[]>([]),
    [batch, setBatch] = useState({ done: 0, total: 0 }),
    [ready, setReady] = useState(false),
    [persistent, setPersistent] = useState(false),
    [storage, setStorage] = useState<{ usage?: number; quota?: number }>({});
  const locked = useRef(false);
  const reload = useCallback(async () => {
    try {
      const result = await auditDownloads();
      setItems(result.records);
      if (result.evicted)
        setError(
          "Your browser removed some downloads. Re-download them before travelling.",
        );
      if (!result.evicted)
        setError((old) =>
          old.startsWith("Your browser removed some downloads") ? "" : old,
        );
      setStorage((await navigator.storage?.estimate?.()) || {});
      setPersistent((await navigator.storage?.persisted?.()) || false);
    } catch {
      setError(
        "Offline storage is unavailable. Check private-browsing and storage settings; online reading still works.",
      );
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    void reload();
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);
  const download = useCallback(
    async (
      articles: Article[],
      metadata: (a: Article) => ReadingMetadata,
      force = false,
    ) => {
      if (locked.current) {
        setError(
          "An offline update is already in progress. Please wait for it to finish.",
        );
        return;
      }
      if (!navigator.onLine) {
        setError("Connect to the internet to download new articles.");
        return;
      }
      locked.current = true;
      setError("");
      setMessage("");
      const unique = [...new Map(articles.map((a) => [a.id, a])).values()];
      setBatch({ done: 0, total: unique.length });
      let done = 0,
        failed = 0,
        partial = 0;
      try {
        try {
          setPersistent((await navigator.storage?.persist?.()) || false);
        } catch {
          /* iOS may decline persistence. */
        }
        for (const article of unique) {
          setWorking([article.id]);
          try {
            const result = await downloadArticle(
              article,
              metadata(article),
              force,
            );
            await updateReading(article.id, metadata(article));
            done++;
            if (result.missingImages.length || result.excludedImages) partial++;
            await reload();
          } catch (e) {
            failed++;
            setError(
              e instanceof DOMException && e.name === "QuotaExceededError"
                ? "Storage is full. Delete downloads to free space."
                : (e as Error).message || "Could not download this article.",
            );
            if (e instanceof DOMException && e.name === "QuotaExceededError")
              break;
          }
          setBatch({ done: done + failed, total: unique.length });
        }
        setMessage(
          `${done} ${done === 1 ? "article" : "articles"} downloaded.${partial ? ` ${partial} with text-only or partial image availability.` : ""}${failed ? ` ${failed} failed.` : ""}`,
        );
      } finally {
        locked.current = false;
        setWorking([]);
        await reload();
      }
    },
    [reload],
  );
  const remove = useCallback(
    async (id: string) => {
      if (locked.current) return;
      try {
        await deleteDownload(id);
        await reload();
        setMessage(
          "Download removed. Bookmarks and reading progress are preserved.",
        );
      } catch {
        setError(
          "Could not delete this download. Try closing other Fylogia tabs.",
        );
      }
    },
    [reload],
  );
  const metadata = useCallback(
    (id: string, value: Partial<ReadingMetadata>) => {
      setItems((old) => old.map((r) => (r.id === id ? { ...r, ...value } : r)));
      void updateReading(id, value).catch(() =>
        setError("Reading metadata could not be saved to offline storage."),
      );
    },
    [],
  );
  const refreshText = useCallback(
    async (articles: Article[]) => {
      if (locked.current || !navigator.onLine) return;
      locked.current = true;
      try {
        if (await refreshDownloadText(articles)) await reload();
      } catch {
        setError(
          "Could not update offline copies. Existing downloads remain readable.",
        );
      } finally {
        locked.current = false;
      }
    },
    [reload],
  );
  return {
    items,
    error,
    message,
    working,
    batch,
    ready,
    persistent,
    storage,
    download,
    remove,
    metadata,
    refreshText,
    reload,
    busy: working.length > 0,
  };
}

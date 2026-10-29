import DOMPurify from "dompurify";
import type { Article } from "./catalog";
// Keep legacy storage names so the brand change never discards downloads.
export const IMAGE_CACHE = "fyllora-offline-images-v1";
const DB = "fyllora-offline";
export interface DownloadedArticle {
  id: string;
  article: Article;
  downloadedAt: string;
  refreshedAt: string;
  images: string[];
  missingImages: string[];
  excludedImages: number;
  bytes: number;
  opaqueImages: number;
  bookmarked: boolean;
  progress: number;
}
export interface ReadingMetadata {
  bookmarked: boolean;
  progress: number;
}
let pending: Promise<IDBDatabase> | undefined;
function database() {
  if (!pending)
    pending = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("articles", { keyPath: "id" });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          pending = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        pending = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        pending = undefined;
        reject(
          new Error("Close other Fylogia tabs to update offline storage."),
        );
      };
    });
  return pending;
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("articles", mode);
    let request: IDBRequest<T>;
    try {
      request = operation(tx.objectStore("articles"));
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error || request.error);
    tx.onabort = () =>
      reject(
        tx.error || new Error("Offline storage transaction was interrupted."),
      );
  });
}
export const listDownloads = () =>
  transaction<DownloadedArticle[]>("readonly", (s) => s.getAll());
const put = (record: DownloadedArticle) =>
  transaction("readwrite", (s) => s.put(record));
export async function updateReading(
  id: string,
  metadata: Partial<ReadingMetadata>,
) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("articles", "readwrite"),
      store = tx.objectStore("articles"),
      request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({ ...request.result, ...metadata });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
function publicUrl(value: string, base: string) {
  try {
    const u = new URL(value, base);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : "";
  } catch {
    return "";
  }
}
export function articleImages(article: Article) {
  const document = new DOMParser().parseFromString(
    DOMPurify.sanitize(article.content),
    "text/html",
  );
  return [
    ...new Set(
      [
        article.image || "",
        ...[...document.querySelectorAll("img[src]")].map(
          (i) => i.getAttribute("src") || "",
        ),
      ]
        .map((u) => publicUrl(u, article.url))
        .filter(Boolean),
    ),
  ];
}
function permittedImage(article: Article, url: string) {
  const hostname = new URL(url).hostname;
  return (
    article.offlineImagesAllowed === true &&
    article.sourceId === "nasa" &&
    (hostname === "nasa.gov" || hostname.endsWith(".nasa.gov"))
  );
}
function offlineContent(article: Article, cached: string[]) {
  const document = new DOMParser().parseFromString(
    DOMPurify.sanitize(article.content),
    "text/html",
  );
  document
    .querySelectorAll("script,iframe,video,audio,source,object,embed")
    .forEach((n) => n.remove());
  document.querySelectorAll("img").forEach((img) => {
    const url = publicUrl(img.getAttribute("src") || "", article.url);
    if (cached.includes(url)) {
      img.setAttribute("src", url);
      img.removeAttribute("srcset");
      img.removeAttribute("loading");
    } else {
      const label = document.createElement("p");
      label.textContent = img.alt
        ? "Image not stored offline: " + img.alt
        : "Publisher image not stored offline.";
      img.replaceWith(label);
    }
  });
  // Keep the supplied RSS content only. No original article page is fetched.
  return {
    ...article,
    image:
      article.image && cached.includes(publicUrl(article.image, article.url))
        ? publicUrl(article.image, article.url)
        : undefined,
    content: document.body.innerHTML,
  };
}
async function verifyImage(url: string) {
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      reject(new Error("Image timed out"));
    }, 12000);
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Publisher image unavailable"));
    };
    img.src = url;
  });
}
async function cacheImage(url: string, cache: Cache, force: boolean) {
  if (!force && (await cache.match(url))) return { bytes: 0, opaque: false };
  let response: Response;
  try {
    response = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(15000),
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.startsWith("image/")
    )
      throw new Error("Not an accessible image");
    const blob = await response.blob();
    if (blob.size > 12 * 1024 * 1024)
      throw new RangeError("Image exceeds 12 MB offline limit");
    const copy = new Response(blob, { headers: { "Content-Type": blob.type } });
    await cache.put(url, copy);
    return { bytes: blob.size, opaque: false };
  } catch (error) {
    if (!navigator.onLine || error instanceof RangeError) throw error;
    // Some image CDNs allow embedding but not CORS. Verify the image and retain
    // its opaque response without attempting to read or bypass its contents.
    await verifyImage(url);
    response = await fetch(url, {
      mode: "no-cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(15000),
    });
    if (response.type !== "opaque") throw error;
    await cache.put(url, response);
    return { bytes: 0, opaque: true };
  }
}
async function storageRoom() {
  const estimate = await navigator.storage?.estimate?.();
  if (
    estimate?.quota &&
    estimate.quota - (estimate.usage || 0) < 10 * 1024 * 1024
  )
    throw new DOMException(
      "Storage is nearly full. Delete downloads before adding more.",
      "QuotaExceededError",
    );
}
export async function downloadArticle(
  article: Article,
  metadata: ReadingMetadata,
  force = false,
) {
  if (!navigator.onLine)
    throw new Error("Connect to the internet to download new articles.");
  if (!article.content && !article.excerpt)
    throw new Error(
      "This saved link has no article text on this device. Open the publisher to read it.",
    );
  await storageRoom();
  const existing = (await listDownloads()).find((r) => r.id === article.id);
  const candidates = articleImages(article),
    permitted = candidates.filter((u) => permittedImage(article, u));
  const cached: string[] = [],
    missing: string[] = [];
  let bytes = new Blob([article.content]).size,
    opaque = 0;
  const cache = await caches.open(IMAGE_CACHE);
  try {
    for (const url of permitted) {
      try {
        const result = await cacheImage(url, cache, force);
        cached.push(url);
        bytes += result.bytes;
        if (result.opaque) opaque++;
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "QuotaExceededError"
        )
          throw error;
        missing.push(url);
      }
    }
    const now = new Date().toISOString();
    const record: DownloadedArticle = {
      id: article.id,
      article: offlineContent(article, cached),
      downloadedAt: existing?.downloadedAt || now,
      refreshedAt: now,
      images: cached,
      missingImages: missing,
      excludedImages: candidates.length - permitted.length,
      bytes,
      opaqueImages: opaque,
      bookmarked: metadata.bookmarked,
      progress: metadata.progress,
    };
    await put(record);
    await rememberDownloads();
    return record;
  } catch (error) {
    await pruneImages();
    throw error;
  }
}
export async function deleteDownload(id: string) {
  await transaction("readwrite", (s) => s.delete(id));
  await pruneImages();
  await rememberDownloads();
}
async function pruneImages() {
  const used = new Set((await listDownloads()).flatMap((r) => r.images));
  const cache = await caches.open(IMAGE_CACHE);
  await Promise.all(
    (await cache.keys())
      .filter((request) => !used.has(request.url))
      .map((request) => cache.delete(request)),
  );
}
async function rememberDownloads() {
  try {
    localStorage.setItem(
      "fyllora.offline.ids",
      JSON.stringify((await listDownloads()).map((r) => r.id)),
    );
  } catch {
    /* IndexedDB remains the authoritative store. */
  }
}
export async function auditDownloads() {
  const records = await listDownloads(),
    cache = await caches.open(IMAGE_CACHE);
  const cached = new Set((await cache.keys()).map((r) => r.url));
  const audited = records.map((record) => {
    const missing = record.images.filter((u) => !cached.has(u));
    return {
      ...record,
      article: offlineContent(
        record.article,
        record.images.filter((u) => cached.has(u)),
      ),
      missingImages: [...new Set([...record.missingImages, ...missing])],
    };
  });
  let evicted = false;
  try {
    const expected: string[] = JSON.parse(
      localStorage.getItem("fyllora.offline.ids") || "[]",
    );
    evicted = expected.some((id) => !records.some((r) => r.id === id));
  } catch {}
  return { records: audited, evicted };
}
export async function refreshDownloadText(latest: Article[]) {
  const lookup = new Map(latest.map((a) => [a.id, a]));
  let changed = 0;
  for (const record of await listDownloads()) {
    const article = lookup.get(record.id);
    if (!article) continue;
    const wanted = articleImages(article),
      allowed = wanted.filter((u) => permittedImage(article, u));
    const kept = record.images.filter((u) => allowed.includes(u));
    const updated = offlineContent(article, kept);
    if (
      updated.content === record.article.content &&
      updated.title === record.article.title &&
      updated.image === record.article.image &&
      JSON.stringify(kept) === JSON.stringify(record.images)
    )
      continue;
    await put({
      ...record,
      article: updated,
      images: kept,
      missingImages: allowed.filter((u) => !kept.includes(u)),
      excludedImages: wanted.length - allowed.length,
      refreshedAt: new Date().toISOString(),
    });
    changed++;
  }
  if (changed) await pruneImages();
  return changed;
}

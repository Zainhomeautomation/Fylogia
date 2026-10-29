import { Download, CloudOff, Trash2, RefreshCw, BookOpen } from "lucide-react";
import type { Article } from "./catalog";
import type { useOfflineLibrary } from "./useOfflineLibrary";
import { dateLabel } from "./storage";
type Library = ReturnType<typeof useOfflineLibrary>;
export function OfflineLibrary({
  library,
  online,
  onOpen,
  onRefresh,
}: {
  library: Library;
  online: boolean;
  onOpen: (a: Article) => void;
  onRefresh: (a: Article) => void;
}) {
  return (
    <section className="offline-library">
      <p className="section-intro">
        Your reading, ready to travel. These copies live on this device and open
        without an internet connection.
      </p>
      <div className="offline-storage">
        <CloudOff size={20} />
        <span>
          {library.items.length} downloaded{" "}
          {library.items.length === 1 ? "story" : "stories"}
        </span>
        <small>
          {library.storage.usage !== undefined
            ? `${(library.storage.usage / 1024 / 1024).toFixed(1)} MB browser storage used`
            : "Storage managed by your browser"}
        </small>
      </div>
      <p className="quiet">
        {library.persistent
          ? "Persistent storage granted."
          : "Your browser may evict downloads when storage is low."}{" "}
        On iPhone or iPad, add Fylogia to the Home Screen and check your
        downloads before travelling. Keep a library export for bookmarks;
        exports do not include downloaded images or PDFs.
      </p>
      {!library.ready ? (
        <p role="status">Checking offline storage…</p>
      ) : !library.items.length ? (
        <div className="empty">
          <Download size={34} />
          <h2>Take a few stories with you.</h2>
          <p>
            Use the download arrow on a story, select several, or download your
            daily edition from For You.
          </p>
        </div>
      ) : (
        <div className="offline-list">
          {library.items.map((record) => (
            <article className="offline-row" key={record.id}>
              <button
                className="offline-open"
                onClick={() => onOpen(record.article)}
              >
                <span className="story-category">{record.article.source}</span>
                <h2>{record.article.title}</h2>
                <p>
                  {record.article.full ? "Article" : "Publisher preview"} ·
                  Downloaded {dateLabel(record.downloadedAt)} ·{" "}
                  {Math.round(record.progress * 100)}% read
                  {record.bookmarked ? " · Bookmarked" : ""}
                </p>
                <small>
                  {record.missingImages.length
                    ? "Text available · some images missing"
                    : record.excludedImages
                      ? `Text available · ${record.images.length} images stored · other images excluded`
                      : record.images.length
                        ? "Text and images available offline"
                        : "Text available offline"}
                </small>
              </button>
              <div className="offline-row-actions">
                <button
                  className="icon-button"
                  aria-label={`Open downloaded ${record.article.title}`}
                  onClick={() => onOpen(record.article)}
                >
                  <BookOpen size={18} />
                </button>
                <button
                  className="icon-button"
                  disabled={!online || library.busy}
                  aria-label={`Refresh download ${record.article.title}`}
                  onClick={() => onRefresh(record.article)}
                >
                  <RefreshCw size={18} />
                </button>
                <button
                  className="icon-button"
                  disabled={library.busy}
                  aria-label={`Delete download ${record.article.title}`}
                  onClick={() => void library.remove(record.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

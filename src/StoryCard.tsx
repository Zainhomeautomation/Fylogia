import { classifyApple } from "./apple-taxonomy";
import { useState } from "react";
import { mediaImage } from "./media-rights";
import {
  Bookmark,
  ArrowUpRight,
  Download,
  Check,
  LoaderCircle,
} from "lucide-react";
import type { Article } from "./catalog";
import { dateLabel } from "./storage";
export function StoryCard({
  article,
  saved,
  onSave,
  onOpen,
  lead = false,
  magazinePage = false,
  onDownload,
  downloaded = false,
  downloading = false,
  onSelect,
  selected = false,
  imageRetryToken = 0,
}: {
  article: Article;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  lead?: boolean;
  magazinePage?: boolean;
  onDownload?: () => void;
  downloaded?: boolean;
  downloading?: boolean;
  onSelect?: () => void;
  selected?: boolean;
  imageRetryToken?: number;
}) {
  const image = mediaImage(article);
  const appleKind = classifyApple(article).kind;
  const [failedImage, setFailedImage] = useState<{
    url: string;
    token: number;
  }>();
  return (
    <article className={"story " + (lead ? "lead" : "")}>
      <div className="story-offline-tools">
        {onSelect && (
          <label className="story-select">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              aria-label={`Select ${article.title}`}
            />
            Select story
          </label>
        )}
        {downloaded && (
          <span className="download-badge">
            <Check size={12} />
            Downloaded
          </span>
        )}
      </div>
      {(article.duplicateCount || 0) > 1 && (
        <span className="duplicate-label">
          One story · {article.duplicateCount} feed entries combined
        </span>
      )}
      <button
        className="story-open"
        data-feed-open={magazinePage ? "true" : undefined}
        onClick={onOpen}
      >
        {image &&
        (failedImage?.url !== image ||
          failedImage.token !== imageRetryToken) ? (
          <img
            src={image}
            alt=""
            loading={lead || magazinePage ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={lead ? "high" : "auto"}
            referrerPolicy="no-referrer"
            onError={() =>
              setFailedImage({ url: image, token: imageRetryToken })
            }
          />
        ) : (
          <div className="type-art" aria-hidden="true">
            <span>{article.categories[0]}</span>
            <strong>{article.source}</strong>
            <ArrowUpRight size={32} />
          </div>
        )}
        <div className="story-category">
          {lead && <span className="cover-label">The cover story · </span>}
          {article.categories[0]}
        </div>
        <span
          className={`content-label ${article.full ? "complete" : "preview"}`}
        >
          {article.full
            ? "Full article · Read here"
            : article.content || article.excerpt
              ? "Publisher preview"
              : "Saved link · Open publisher"}
        </span>
        {appleKind && <span className="editorial-label">{appleKind}</span>}
        <h2>{article.title}</h2>
        {(lead || magazinePage) && <p>{article.excerpt}</p>}
        {magazinePage && (
          <span className="feed-read">
            Tap to read <ArrowUpRight size={14} />
          </span>
        )}
      </button>
      <div className="story-meta">
        <span>
          {article.source} <span aria-hidden="true">·</span>{" "}
          {dateLabel(article.published)}
        </span>
        {onDownload && (article.content || article.excerpt) && (
          <button
            className="icon-button"
            disabled={downloading || downloaded}
            aria-label={`${downloaded ? "Downloaded" : downloading ? "Downloading" : "Download offline"} ${article.title}`}
            onClick={onDownload}
          >
            {downloading ? (
              <LoaderCircle className="spinning" size={18} />
            ) : downloaded ? (
              <Check size={18} />
            ) : (
              <Download size={18} />
            )}
          </button>
        )}
        <button
          className={"icon-button " + (saved ? "is-saved" : "")}
          aria-label={`${saved ? "Unsave" : "Save"} ${article.title}`}
          onClick={onSave}
        >
          <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}

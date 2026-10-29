import { Bookmark, ArrowUpRight } from "lucide-react";
import type { Article } from "./catalog";
import { dateLabel } from "./storage";
export function StoryCard({
  article,
  saved,
  onSave,
  onOpen,
  lead = false,
}: {
  article: Article;
  saved: boolean;
  onSave: () => void;
  onOpen: () => void;
  lead?: boolean;
}) {
  return (
    <article className={"story " + (lead ? "lead" : "")}>
      <button className="story-open" onClick={onOpen}>
        {article.image ? (
          <img
            src={article.image}
            alt=""
            loading={lead ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="type-art" aria-hidden="true">
            <span>{article.categories[0]}</span>
            <strong>{article.source}</strong>
            <ArrowUpRight size={32} />
          </div>
        )}
        <div className="story-category">{article.categories[0]}</div>
        <h2>{article.title}</h2>
        {lead && <p>{article.excerpt}</p>}
      </button>
      <div className="story-meta">
        <span>
          {article.source} <span aria-hidden="true">·</span>{" "}
          {dateLabel(article.published)}
        </span>
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

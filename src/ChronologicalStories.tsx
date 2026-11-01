import type { ReactNode } from "react";
import type { Article } from "./catalog";
import { newsDay } from "./news-chronology";
export function ChronologicalStories({
  articles,
  renderStory,
}: {
  articles: Article[];
  renderStory: (a: Article, lead: boolean) => ReactNode;
}) {
  const groups: { label: string; articles: Article[] }[] = [];
  for (const article of articles.slice(0, 75)) {
    const label = newsDay(article),
      last = groups.at(-1);
    if (last?.label === label) last.articles.push(article);
    else groups.push({ label, articles: [article] });
  }
  return (
    <>
      {groups.map((g, i) => (
        <section
          key={g.label}
          className="chronology-section"
          aria-label={g.label}
        >
          <div className="section-heading">
            <h2>{g.label}</h2>
            <span>{g.articles.length} stories</span>
          </div>
          <div className="editorial-grid">
            {g.articles
              .slice(0, 3)
              .map((a, j) => renderStory(a, i === 0 && j === 0))}
          </div>
          {g.articles.length > 3 && (
            <div className="story-grid">
              {g.articles.slice(3).map((a) => renderStory(a, false))}
            </div>
          )}
        </section>
      ))}
      {articles.length > 75 && (
        <p className="quiet">
          Showing the first 75 stories. Filter or search to discover more.
        </p>
      )}
    </>
  );
}

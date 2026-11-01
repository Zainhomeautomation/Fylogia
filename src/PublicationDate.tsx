import type { Article } from "./catalog";
import { publicationTime, publishedLabel } from "./news-chronology";
export function PublicationDate({ article }: { article: Article }) {
  return (
    <time
      dateTime={
        publicationTime(article) !== undefined ? article.published : undefined
      }
    >
      {publishedLabel(article)}
    </time>
  );
}

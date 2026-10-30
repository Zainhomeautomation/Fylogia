import type { Article } from "./catalog";
export const restrictedMediaNotice = /copyright|©|&copy;|&#(?:0*169|x0*a9);/i;
export function restrictedNasaMedia(
  article: Pick<Article, "sourceId" | "content">,
) {
  return (
    ["nasa", "nasa-science"].includes(article.sourceId) &&
    restrictedMediaNotice.test(article.content)
  );
}
export function mediaImage(
  article: Pick<Article, "sourceId" | "content" | "image">,
) {
  return restrictedNasaMedia(article) ? undefined : article.image;
}
// NASA's general permission does not license explicitly copyrighted third-party photographs.
// Keep other figures and all prose. Also used at display time for legacy local copies.
export function omitRestrictedFigures(document: Document) {
  for (const figure of document.querySelectorAll("figure"))
    if (restrictedMediaNotice.test(figure.textContent || "")) figure.remove();
}

import type { Article, Preferences } from "./catalog.ts";
import { applePreferenceScore } from "./apple-taxonomy.ts";
import { topicMatchesText } from "./interest-taxonomy.ts";
import { mediaImage } from "./media-rights.ts";
import { articleSports, sports } from "./sports-taxonomy.ts";

const words = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];

// Search only existing publisher metadata, never generated keywords or HTML.
export function storySearchScore(article: Article, query: string) {
  const terms = [...new Set(words(query))];
  if (!terms.length) return 0;
  const fields = [
    { tokens: words(article.title), weight: 8 },
    { tokens: words(article.source), weight: 5 },
    {
      tokens: words(
        [
          ...article.categories,
          ...(article.categories.includes("AI")
            ? ["Artificial Intelligence"]
            : []),
          ...articleSports(article).map(
            (id) => sports.find((s) => s.id === id)!.name,
          ),
          ...(article.publisherTags || []),
          ...(article.apple?.topics || []),
          article.region,
          ...(article.feedContexts || []).flatMap((c) => c.categories),
        ].join(" "),
      ),
      weight: 3,
    },
    { tokens: words(article.excerpt), weight: 1 },
  ];
  let score = 0;
  for (const term of terms) {
    const field = fields.find((f) => f.tokens.some((w) => w.startsWith(term)));
    if (!field) return 0;
    score += field.weight;
  }
  return score;
}

// Explicit follows/region/topic filtering remains in articleMatchesLibrary.
// These bounded, local signals change ordering only: no new tracking or storage.
export function rankForYou(
  articles: Article[],
  prefs: Preferences,
  history: Article[],
  saved: Article[],
  now = Date.now(),
) {
  const seen = new Set(history.map((a) => a.id));
  const bookmarked = new Set(saved.map((a) => a.id));
  const recent = [...history.slice(0, 16), ...saved.slice(0, 16)];
  const subjects = new Set(
    recent
      .flatMap((a) => [
        ...a.categories,
        ...(a.publisherTags || []),
        ...(a.apple?.topics || []),
      ])
      .map((s) => s.toLowerCase()),
  );
  const ranked = articles
    .map((article, index) => {
      const days = Math.max(
        0,
        (now - Date.parse(article.published)) / 86400000,
      );
      const related = [
        ...article.categories,
        ...(article.publisherTags || []),
        ...(article.apple?.topics || []),
      ].filter((s) => subjects.has(s.toLowerCase())).length;
      const score =
        prefs.topics.reduce(
          (n, t) =>
            n +
            (topicMatchesText(t, article.title + " " + article.excerpt)
              ? 3
              : 0),
          0,
        ) +
        applePreferenceScore(article, prefs) * 10 +
        (mediaImage(article) ? 1 : 0) +
        (article.full ? 2 : 0) +
        (Number.isFinite(days) ? 6 / (1 + days / 2) : 0) +
        Math.min(3, related) +
        (bookmarked.has(article.id) ? 1 : 0) -
        (seen.has(article.id) ? 6 : 0);
      return { article, score, index };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.article.published.localeCompare(a.article.published) ||
        a.index - b.index,
    );
  // Round-robin publishers after scoring so one prolific feed cannot fill a screen.
  const groups = new Map<string, Article[]>();
  for (const { article } of ranked) {
    const group = groups.get(article.sourceId);
    if (group) group.push(article);
    else groups.set(article.sourceId, [article]);
  }
  const result: Article[] = [];
  for (let round = 0; result.length < ranked.length; round++)
    for (const group of groups.values())
      if (group[round]) result.push(group[round]);
  return result;
}

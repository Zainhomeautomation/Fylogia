import { classifyApple, sourceHasAppleCoverage } from "./apple-taxonomy.ts";
import {
  selectedSports,
  sourceSports,
  sportsPreferenceMatches,
  sportsRecommendationBoost,
} from "./sports-taxonomy.ts";
import { topicMatchesText } from "./interest-taxonomy.ts";
import type { Article, Source, Preferences, FeedStatus } from "./catalog";
export const feedArray = (v: any): any[] =>
  !v ? [] : Array.isArray(v) ? v : [v];
export const feedValue = (v: any): string =>
  typeof v === "string" ? v : String(v?.["#text"] ?? "");
export function publicUrl(value: string, base?: string) {
  try {
    const u = new URL(value.replace(/&(?:amp|#0*38|#x0*26);/gi, "&"), base);
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      return "";
    u.protocol = "https:";
    return u.href;
  } catch {
    return "";
  }
}
export function itemLink(item: any) {
  return publicUrl(
    feedValue(item.link) ||
      feedArray(item.link).find(
        (l) => (!l["@_rel"] || l["@_rel"] === "alternate") && l["@_href"],
      )?.["@_href"] ||
      item.guid?.["#text"] ||
      "",
  );
}
export function latestPublication(items: any[], now = Date.now()) {
  const dates = items
    .map((i) =>
      new Date(
        feedValue(i.pubDate || i.published || i.updated || i["dc:date"]),
      ).getTime(),
    )
    .filter((n) => Number.isFinite(n) && n <= now + 48 * 3600000);
  return dates.length ? new Date(Math.max(...dates)).toISOString() : "";
}
export function feedFreshness(
  latest: string,
  now = Date.now(),
): "fresh" | "aging" | "stale" | "unknown" {
  const date = Date.parse(latest);
  if (!Number.isFinite(date)) return "unknown";
  const days = Math.max(0, (now - date) / 86400000);
  return days <= 30 ? "fresh" : days <= 90 ? "aging" : "stale";
}
export function canonicalStoryUrl(value: string) {
  try {
    const u = new URL(value);
    u.hash = "";
    u.protocol = "https:";
    u.hostname = u.hostname.replace(/^www\./, "");
    for (const key of [...u.searchParams.keys()])
      if (/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key))
        u.searchParams.delete(key);
    u.searchParams.sort();
    if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/$/, "");
    return u.href;
  } catch {
    return value;
  }
}
export function deduplicateArticles(
  groups: {
    id: string;
    articles: Article[];
    source?: Pick<Source, "categories" | "region">;
  }[],
) {
  const records = new Map<
    string,
    {
      article: Article;
      sources: Set<string>;
      contexts: Map<
        string,
        { sourceId: string; categories: string[]; region: string }
      >;
      count: number;
      publisherTags: Set<string>;
      appleTopics: Set<string>;
      appleKinds: Set<string>;
    }
  >();
  const titles = new Map<string, string>();
  const aliases = new Map<string, string>();
  let duplicatesRemoved = 0;
  const score = (a: Article) =>
    (a.full ? 100 : 0) + (a.offlineImagesAllowed ? 10 : 0) + (a.image ? 1 : 0);
  for (const group of groups)
    for (const input of group.articles) {
      const {
        alsoIn: _old,
        duplicateCount: _count,
        feedContexts: _contexts,
        ...article
      } = input;
      const classification =
        group.source ||
        input.feedContexts?.find((c) => c.sourceId === group.id) ||
        input;
      const context = {
        sourceId: group.id,
        categories: classification.categories || [],
        region: classification.region || "Worldwide",
      };
      const canonical = canonicalStoryUrl(article.url);
      const title = article.title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
      const signature =
        title.length >= 40 && article.published
          ? new URL(canonical).hostname +
            "|" +
            title +
            "|" +
            article.published.slice(0, 10)
          : "";
      const key = aliases.has(canonical)
        ? aliases.get(canonical)!
        : (signature && titles.get(signature)) || canonical;
      const old = records.get(key);
      if (old) {
        old.sources.add(group.id);
        old.sources.add(article.sourceId);
        old.contexts.set(group.id, context);
        old.count++;
        for (const tag of article.publisherTags || [])
          old.publisherTags.add(tag);
        for (const tag of article.apple?.topics || []) old.appleTopics.add(tag);
        if (article.apple?.kind) old.appleKinds.add(article.apple.kind);
        duplicatesRemoved++;
        if (score(article) >= score(old.article)) old.article = article;
      } else
        records.set(key, {
          article,
          sources: new Set([group.id, article.sourceId]),
          contexts: new Map([[group.id, context]]),
          count: 1,
          publisherTags: new Set(article.publisherTags || []),
          appleTopics: new Set(article.apple?.topics || []),
          appleKinds: new Set(article.apple?.kind ? [article.apple.kind] : []),
        });
      aliases.set(canonical, key);
      if (signature) titles.set(signature, key);
    }
  const articles = [...records.values()].map(
    ({
      article,
      sources,
      contexts,
      count,
      publisherTags,
      appleTopics,
      appleKinds,
    }) => ({
      ...article,
      ...(publisherTags.size
        ? { publisherTags: [...publisherTags].slice(0, 24) }
        : {}),
      ...(appleTopics.size || appleKinds.size
        ? {
            apple: {
              topics: [...appleTopics],
              kind: [
                "Official announcement",
                "Rumor / leak",
                "Review",
                "Opinion",
              ].find((k) => appleKinds.has(k)),
            },
          }
        : {}),
      categories: [
        ...new Set([...contexts.values()].flatMap((c) => c.categories)),
      ],
      ...(sources.size > 1 || count > 1
        ? {
            feedContexts: [...contexts.values()],
            alsoIn: [...sources].filter((id) => id !== article.sourceId),
          }
        : {}),
      ...(count > 1 ? { duplicateCount: count } : {}),
    }),
  );
  return { articles, duplicatesRemoved };
}
export function recommendSources(
  all: Source[],
  prefs: Pick<Preferences, "interests" | "region"> &
    Partial<Pick<Preferences, "topics">>,
  statuses: FeedStatus[],
  limit = 12,
) {
  const selected = selectedSports(prefs.topics);
  const ranked = all
    .filter(
      (s) =>
        (s.categories.some((c) => prefs.interests.includes(c)) ||
          (prefs.interests.includes("Apple") &&
            sourceHasAppleCoverage(s.id))) &&
        (!selected.length ||
          !s.categories.includes("Sports") ||
          s.categories.some(
            (category) =>
              category !== "Sports" && prefs.interests.includes(category),
          ) ||
          !sourceSports(s).length ||
          sourceSports(s).some((id) => selected.includes(id))) &&
        (prefs.region === "Worldwide" ||
          s.region === "Worldwide" ||
          s.region === prefs.region) &&
        !statuses.some(
          (x) => x.id === s.id && (!x.ok || x.freshness === "stale"),
        ),
    )
    .sort((a, b) => {
      const score = (s: Source) =>
        s.categories.filter((c) => prefs.interests.includes(c)).length * 3 +
        (s.full ? 4 : 0) +
        (prefs.interests.includes("Apple") && s.id === "apple" ? 3 : 0) +
        (selected.length ? sportsRecommendationBoost(s.id) : 0) +
        (prefs.topics || []).filter((t) =>
          topicMatchesText(t, (s.topics || []).join(" · ")),
        ).length *
          5 +
        (s.region === prefs.region ? 2 : 0);
      return score(b) - score(a) || a.name.localeCompare(b.name);
    });
  const chosen: Source[] = [];
  // Give each selected interest representation before filling by rank.
  for (const category of prefs.interests) {
    if (chosen.length >= limit) break;
    if (chosen.some((s) => s.categories.includes(category))) continue;
    const candidate = ranked.find((s) => s.categories.includes(category));
    if (candidate) chosen.push(candidate);
  }
  // Represent each followed sport before filling the remaining recommendation slots.
  for (const sport of selected) {
    if (
      chosen.length >= limit ||
      chosen.some((s) => sourceSports(s).includes(sport))
    )
      continue;
    const candidate = ranked.find((s) => sourceSports(s).includes(sport));
    if (candidate) chosen.push(candidate);
  }
  return [
    ...chosen,
    ...ranked.filter((s) => !chosen.some((c) => c.id === s.id)),
  ].slice(0, Math.max(0, limit));
}
export function sourceMatches(
  s: Source,
  query: string,
  category: string,
  region: string,
  content: string,
) {
  return (
    (!query.trim() ||
      (
        s.name +
        " " +
        s.categories.join(" ") +
        " " +
        (s.topics || []).join(" ") +
        " " +
        s.region +
        " " +
        s.site
      )
        .toLowerCase()
        .includes(query.trim().toLowerCase())) &&
    (category === "All categories" ||
      s.categories.includes(category) ||
      (category === "Apple" && sourceHasAppleCoverage(s.id))) &&
    (region === "All regions" || s.region === region) &&
    (content === "All content" ||
      (content === "Full text capable" ? !!s.full : !s.full))
  );
}

export function articleMatchesLibrary(
  article: Article,
  prefs: Pick<Preferences, "sourceIds" | "region"> &
    Partial<Pick<Preferences, "topics" | "customSources" | "interests">>,
) {
  const contexts = article.feedContexts || [
    {
      sourceId: article.sourceId,
      categories: article.categories,
      region: article.region,
    },
    ...(article.alsoIn || []).map((sourceId) => ({
      sourceId,
      categories: article.categories,
      region: article.region,
    })),
  ];
  return (
    sportsPreferenceMatches(article, prefs) &&
    contexts.some(
      (c) =>
        prefs.sourceIds.includes(c.sourceId) &&
        (prefs.region === "Worldwide" ||
          c.region === prefs.region ||
          (c.region === "Worldwide" && !c.categories.includes("World News"))),
    )
  );
}

// Apply additive taxonomy labels in memory. Saved/offline bodies and stored
// metadata are never rewritten just because the source directory gained topics.
export function withCurrentCategories(
  article: Article,
  directory: ReadonlyMap<string, Pick<Source, "categories">>,
): Article {
  const labels = new Set(article.categories);
  const previousSize = labels.size;
  if (classifyApple(article).topics.length) labels.add("Apple");
  for (const id of [article.sourceId, ...(article.alsoIn || [])])
    for (const category of directory.get(id)?.categories || [])
      labels.add(category);
  return labels.size === previousSize
    ? article
    : { ...article, categories: [...labels] };
}
